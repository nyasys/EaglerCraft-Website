use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::os::fd::AsRawFd;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Condvar, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

const HOST: &str = "127.0.0.1";
const PORT: u16 = 4173;
const GAME_URL: &str =
    "https://raw.githubusercontent.com/nyasys/EaglerCraft-Website/main/GAMES/";
const LFS_URL: &str =
    "https://github.com/nyasys/EaglerCraft-Website.git/info/lfs/objects/batch";

extern "C" {
    fn sendfile(
        out_fd: i32,
        in_fd: i32,
        offset: *mut i64,
        count: usize,
    ) -> isize;
}

type Bytes = Arc<Vec<u8>>;

struct Flight {
    claimed: Mutex<bool>,
    done: Mutex<bool>,
    ready: Condvar,
}

struct Cache {
    static_files: Mutex<HashMap<String, Bytes>>,
    games: Mutex<HashMap<String, Bytes>>,
    missing_games: Mutex<HashMap<String, ()>>,
    flights: Mutex<HashMap<String, Arc<Flight>>>,
}

fn cache() -> &'static Cache {
    static CACHE: OnceLock<Cache> = OnceLock::new();
    CACHE.get_or_init(|| Cache {
        static_files: Mutex::new(HashMap::new()),
        games: Mutex::new(HashMap::new()),
        missing_games: Mutex::new(HashMap::new()),
        flights: Mutex::new(HashMap::new()),
    })
}

fn project_root() -> PathBuf {
    env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn percent_decode(input: &str) -> Option<String> {
    let source = input.as_bytes();
    let mut output = Vec::with_capacity(source.len());
    let mut index = 0;

    while index < source.len() {
        match source[index] {
            b'%' if index + 2 < source.len() => {
                let value = u8::from_str_radix(
                    std::str::from_utf8(&source[index + 1..index + 3]).ok()?,
                    16,
                )
                .ok()?;
                output.push(value);
                index += 3;
            }
            b'+' => {
                output.push(b' ');
                index += 1;
            }
            value => {
                output.push(value);
                index += 1;
            }
        }
    }

    String::from_utf8(output).ok()
}

fn encode_path_segment(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            output.push(byte as char);
        } else {
            output.push_str(&format!("%{:02X}", byte));
        }
    }
    output
}

fn valid_game_name(name: &str) -> bool {
    !name.is_empty()
        && !name.contains('/')
        && !name.contains('\\')
        && !name.contains("..")
        && (name.to_lowercase().ends_with(".html")
            || name.to_lowercase().ends_with(".zip"))
}

fn run_curl(arguments: &[&str]) -> Option<Vec<u8>> {
    let mut command = Command::new("curl");
    command.args([
        "--fail",
        "--location",
        "--silent",
        "--show-error",
        "--connect-timeout",
        "10",
        "--max-time",
        "60",
    ]);
    command.args(arguments);

    let output = command.output().ok()?;
    output.status.success().then_some(output.stdout)
}

fn lfs_pointer(contents: &[u8]) -> Option<(String, usize)> {
    let text = std::str::from_utf8(contents).ok()?;
    let mut oid = None;
    let mut size = None;

    for line in text.lines() {
        if let Some(value) = line.strip_prefix("oid sha256:") {
            oid = Some(value.trim().to_owned());
        } else if let Some(value) = line.strip_prefix("size ") {
            size = value.trim().parse().ok();
        }
    }

    match (oid, size) {
        (Some(oid), Some(size)) if oid.len() == 64 => Some((oid, size)),
        _ => None,
    }
}

fn download_lfs(oid: &str, size: usize) -> Option<Vec<u8>> {
    let request = format!(
        "{{\"operation\":\"download\",\"transfers\":[\"basic\"],\"objects\":[{{\"oid\":\"{}\",\"size\":{}}}]}}",
        oid, size
    );
    let response = run_curl(&[
        "--request",
        "POST",
        "--header",
        "Accept: application/vnd.git-lfs+json",
        "--header",
        "Content-Type: application/vnd.git-lfs+json",
        "--header",
        "User-Agent: git-lfs/3.5.0",
        "--data",
        &request,
        LFS_URL,
    ])?;

    let json = std::str::from_utf8(&response).ok()?;
    let marker = "\"href\":\"";
    let start = json.find(marker)? + marker.len();
    let remainder = &json[start..];
    let end = remainder.find('"')?;
    let href = remainder[..end].replace("\\/", "/").replace("\\u0026", "&");

    run_curl(&[&href])
}

fn disk_cache_path(name: &str) -> PathBuf {
    env::temp_dir()
        .join("eaglercraft-website-games")
        .join(encode_path_segment(name))
}

fn fetch_game_uncached(name: &str) -> Option<Vec<u8>> {
    let url = format!("{}{}", GAME_URL, encode_path_segment(name));
    let response = run_curl(&["--header", "User-Agent: Mozilla/5.0", &url])?;

    match lfs_pointer(&response) {
        Some((oid, size)) => download_lfs(&oid, size),
        None => Some(response),
    }
}

fn fetch_game(name: &str) -> Option<Bytes> {
    if !valid_game_name(name) {
        return None;
    }

    if let Ok(missing) = cache().missing_games.lock() {
        if missing.contains_key(name) {
            return None;
        }
    }

    if let Ok(games) = cache().games.lock() {
        if let Some(body) = games.get(name) {
            return Some(Arc::clone(body));
        }
    }

    if let Ok(body) = fs::read(disk_cache_path(name)) {
        let body: Bytes = Arc::new(body);
        if let Ok(mut games) = cache().games.lock() {
            games.insert(name.to_owned(), Arc::clone(&body));
        }
        return Some(body);
    }

    let flight = {
        let mut flights = cache().flights.lock().ok()?;
        Arc::clone(
            flights
                .entry(name.to_owned())
                .or_insert_with(|| Arc::new(Flight {
                    claimed: Mutex::new(false),
                    done: Mutex::new(false),
                    ready: Condvar::new(),
                })),
        )
    };

    let is_owner = {
        let mut claimed = flight.claimed.lock().ok()?;
        if *claimed {
            false
        } else {
            *claimed = true;
            true
        }
    };

    if !is_owner {
        let mut done = flight.done.lock().ok()?;
        while !*done {
            done = flight.ready.wait(done).ok()?;
        }
        drop(done);

        if let Ok(games) = cache().games.lock() {
            if let Some(body) = games.get(name) {
                return Some(Arc::clone(body));
            }
        }
        return fs::read(disk_cache_path(name))
            .ok()
            .map(|body| Arc::new(body));
    }

    let result = fetch_game_uncached(name).map(Arc::new);
    if let Some(body) = &result {
        if fs::create_dir_all(disk_cache_path(name).parent()?).is_ok() {
            let _ = fs::write(disk_cache_path(name), body.as_slice());
        }
        if let Ok(mut games) = cache().games.lock() {
            games.insert(name.to_owned(), Arc::clone(body));
        }
    } else if let Ok(mut missing) = cache().missing_games.lock() {
        missing.insert(name.to_owned(), ());
    }

    if let Ok(done) = flight.done.lock() {
        let mut done = done;
        *done = true;
        flight.ready.notify_all();
    }
    if let Ok(mut flights) = cache().flights.lock() {
        flights.remove(name);
    }

    result
}

fn static_path(public: &Path, request_path: &str) -> Option<PathBuf> {
    let path = request_path.split('?').next().unwrap_or("/");
    let decoded = percent_decode(path)?;
    let relative = decoded.trim_start_matches('/');
    let mut file = public.to_path_buf();

    if relative.is_empty() {
        return Some(file.join("index.html"));
    }

    for component in Path::new(relative).components() {
        match component {
            Component::Normal(value) => file.push(value),
            Component::CurDir => {}
            _ => return None,
        }
    }

    if file.is_dir() {
        file.push("index.html");
    }
    file.is_file().then_some(file)
}

fn mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("json") => "application/json",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("ico") => "image/x-icon",
        Some("zip") => "application/zip",
        _ => "application/octet-stream",
    }
}

fn range_bounds(range: Option<&str>, length: usize) -> Option<(usize, usize)> {
    let value = range?.strip_prefix("bytes=")?;
    let (start, end) = value.split_once('-')?;
    let start = start.parse::<usize>().ok()?;
    let end = if end.is_empty() {
        length.saturating_sub(1)
    } else {
        end.parse::<usize>().ok()?.min(length.saturating_sub(1))
    };
    (start <= end && start < length).then_some((start, end))
}

fn send_response(
    stream: &mut TcpStream,
    status: &str,
    content_type: &str,
    body: &[u8],
    head_only: bool,
    extra: &str,
) {
    let headers = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: public, max-age=3600\r\nConnection: close\r\n{}\r\n",
        status, content_type, body.len(), extra
    );
    if stream.write_all(headers.as_bytes()).is_err() {
        return;
    }
    if !head_only {
        let _ = stream.write_all(body);
    }
}

fn send_cached_file(
    stream: &mut TcpStream,
    status: &str,
    content_type: &str,
    file: &std::fs::File,
    start: u64,
    end: u64,
    head_only: bool,
    extra: &str,
) {
    let length = end.saturating_sub(start).saturating_add(1);
    let headers = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: public, max-age=3600\r\nConnection: close\r\n{}\r\n",
        status, content_type, length, extra
    );
    if stream.write_all(headers.as_bytes()).is_err() || head_only {
        return;
    }

    let mut offset = start as i64;
    let mut remaining = length;
    let out_fd = stream.as_raw_fd();
    let in_fd = file.as_raw_fd();

    while remaining > 0 {
        let sent = unsafe {
            sendfile(
                out_fd,
                in_fd,
                &mut offset,
                remaining as usize,
            )
        };
        match sent {
            sent if sent > 0 => remaining -= sent as u64,
            sent if sent == -1 && std::io::Error::last_os_error().raw_os_error() == Some(11) => {
                thread::yield_now();
            }
            _ => break,
        }
    }
}

fn static_file(root: &Path, path: &str) -> Option<Bytes> {
    let file = static_path(&root.join("public"), path)?;
    let key = file.to_string_lossy().into_owned();

    if let Ok(files) = cache().static_files.lock() {
        if let Some(body) = files.get(&key) {
            return Some(Arc::clone(body));
        }
    }

    let body: Bytes = Arc::new(fs::read(file).ok()?);
    if let Ok(mut files) = cache().static_files.lock() {
        files.insert(key, Arc::clone(&body));
    }
    Some(body)
}

fn handle_request(mut stream: TcpStream, root: &Path) {
    let _ = stream.set_nodelay(true);
    let _ = stream.set_read_timeout(Some(Duration::from_secs(30)));

    let mut request = [0u8; 16384];
    let size = match stream.read(&mut request) {
        Ok(size) if size > 0 => size,
        _ => return,
    };
    let text = String::from_utf8_lossy(&request[..size]);
    let mut fields = text.lines().next().unwrap_or("").split_whitespace();
    let method = fields.next().unwrap_or("");
    let target = fields.next().unwrap_or("/");

    let range = text
        .lines()
        .find_map(|line| {
            let lower = line.to_lowercase();
            lower
                .strip_prefix("range:")
                .map(|value| value.trim().to_owned())
        });

    if method != "GET" && method != "HEAD" {
        send_response(
            &mut stream,
            "405 Method Not Allowed",
            "text/plain",
            b"Method not allowed",
            method == "HEAD",
            "Allow: GET, HEAD\r\n",
        );
        return;
    }
    let head_only = method == "HEAD";
    let path = target.split('?').next().unwrap_or("/");

    if let Some(encoded_name) = path.strip_prefix("/GAMES/") {
        let name = match percent_decode(encoded_name) {
            Some(name) => name,
            None => {
                send_response(&mut stream, "404 Not Found", "text/plain", b"Not found", head_only, "");
                return;
            }
        };

        let body = match fetch_game(&name) {
            Some(body) => body,
            None => {
                send_response(&mut stream, "404 Not Found", "text/plain", b"Game file not found", head_only, "");
                return;
            }
        };

        let content_type = if name.to_lowercase().ends_with(".zip") {
            "application/zip"
        } else {
            "text/html; charset=utf-8"
        };
        let disposition = if name.to_lowercase().ends_with(".zip") {
            format!("Content-Disposition: attachment; filename=\"{}\"\r\n", name)
        } else {
            String::new()
        };

        if let Some((start, end)) = range_bounds(range.as_deref(), body.len()) {
            let extra = format!(
                "{}Content-Range: bytes {}-{}/{}\r\n",
                disposition,
                start,
                end,
                body.len()
            );
            if let Ok(file) = fs::File::open(disk_cache_path(&name)) {
                send_cached_file(
                    &mut stream,
                    "206 Partial Content",
                    content_type,
                    &file,
                    start as u64,
                    end as u64,
                    head_only,
                    &extra,
                );
            } else {
                send_response(
                    &mut stream,
                    "206 Partial Content",
                    content_type,
                    &body[start..=end],
                    head_only,
                    &extra,
                );
            }
        } else {
            if let Ok(file) = fs::File::open(disk_cache_path(&name)) {
                let length = file.metadata().map(|metadata| metadata.len()).unwrap_or(body.len() as u64);
                let no_disposition_extra = disposition.as_str();
                send_cached_file(
                    &mut stream,
                    "200 OK",
                    content_type,
                    &file,
                    0,
                    length.saturating_sub(1),
                    head_only,
                    no_disposition_extra,
                );
            } else {
                send_response(
                    &mut stream,
                    "200 OK",
                    content_type,
                    body.as_slice(),
                    head_only,
                    &disposition,
                );
            }
        }
        return;
    }

    match static_file(root, path) {
        Some(body) => {
            let file = static_path(&root.join("public"), path).unwrap();
            if let Ok(cached_file) = fs::File::open(&file) {
                let length = cached_file.metadata().map(|metadata| metadata.len()).unwrap_or(body.len() as u64);
                send_cached_file(
                    &mut stream,
                    "200 OK",
                    mime_type(&file),
                    &cached_file,
                    0,
                    length.saturating_sub(1),
                    head_only,
                    "",
                );
            } else {
                send_response(
                    &mut stream,
                    "200 OK",
                    mime_type(&file),
                    body.as_slice(),
                    head_only,
                    "",
                );
            }
        }
        None => send_response(
            &mut stream,
            "404 Not Found",
            "text/plain",
            b"Not found",
            head_only,
            "",
        ),
    }
}

fn main() -> std::io::Result<()> {
    let root = project_root();
    let listener = TcpListener::bind((HOST, PORT))?;
    println!("Serving the site at http://localhost:{PORT}/");

    let warm_root = root.clone();
    thread::spawn(move || {
        for name in ["1.12.2.html", "1.12.2-wasm.html", "1.8.8.html", "1.8.8-wasm.html"] {
            let _ = fetch_game(name);
        }
        for name in ["index.html", "games.json", "stylesheets/style.css", "javascripts/game-picker.js"] {
            let _ = static_file(&warm_root, &format!("/{}", name));
        }
    });

    for connection in listener.incoming() {
        if let Ok(stream) = connection {
            let root = root.clone();
            thread::spawn(move || handle_request(stream, &root));
        }
    }

    Ok(())
}
