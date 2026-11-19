ts
const UPSTREAM_URL = "https://raw.githubusercontent.com/nyasys/EaglerCraft-Website/main/GAMES/"; // Quick URL Fix
const lfsBatchUrl = "https://github.com/nyasys/EaglerCraft-Website.git/info/lfs/objects/batch"; // Quick URL Fix

type GitLfsPointer = {
  oid: string;
  size: number;
};

type GitLfsBatchResponse = {
  objects?: Array<{
    actions?: {
      download?: {
        href?: string;
      };
    };
  }>;
};

function getGameFilename(pathname: string): string | undefined {
  if (!pathname.startsWith("/GAMES/")) return;

  let filename: string;
  try {
    filename = decodeURIComponent(pathname.slice("/GAMES/".length));
  } catch {
    return;
  }

  if (
    !/^[A-Za-z0-9._ -]+\.(html|zip)$/i.test(filename) ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return;
  }

  return filename;
}

function parseGitLfsPointer(contents: string): GitLfsPointer | undefined {
  const match =
    /^version https:\/\/git-lfs\.github\.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)$/.exec(
      contents.trim(),
    );
  if (!match) return;

  const oid = match[1];
  const sizeText = match[2];
  if (!oid || !sizeText) return;

  const size = Number(sizeText);
  if (!Number.isSafeInteger(size)) return;

  return { oid, size };
}

async function fetchGitLfsObject(pointer: GitLfsPointer, request: Request): Promise<Response> {
  const batch = await fetch(lfsBatchUrl, {
    method: "POST",
    headers: {
      accept: "application/vnd.git-lfs+json",
      "content-type": "application/vnd.git-lfs+json",
      "user-agent": "git-lfs/3.5.0",
    },
    body: JSON.stringify({
      operation: "download",
      transfers: ["basic"],
      objects: [pointer],
    }),
  });
  if (!batch.ok) {
    throw new Error(`Git LFS request failed with status ${batch.status}.`);
  }

  const payload = (await batch.json()) as GitLfsBatchResponse;
  const href = payload.objects?.[0]?.actions?.download?.href;
  if (!href) throw new Error("Git LFS did not return a download URL.");

  const downloadUrl = new URL(href);
  if (
    downloadUrl.protocol !== "https:" ||
    !downloadUrl.hostname.endsWith(".githubusercontent.com")
  ) {
    throw new Error("Git LFS returned an unexpected download host.");
  }

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  return fetch(downloadUrl, { method: request.method, headers });
}

async function serveGameFile(request: Request, filename: string): Promise<Response> {
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  let response: Response;
  try {
    response = await fetch(`${gameFilesUrl}${encodeURIComponent(filename)}`, {
      method: request.method,
      headers,
    });

    if (response.ok) {
      const contentLength = response.headers.get("content-length");
      let pointer =
        contentLength && Number(contentLength) <= 200
          ? parseGitLfsPointer(await response.clone().text())
          : undefined;
      if (!pointer) {
        const probe = await fetch(`${gameFilesUrl}${encodeURIComponent(filename)}`, {
          headers: { range: "bytes=0-200" },
        });
        if (probe.ok) pointer = parseGitLfsPointer(await probe.text());
      }
      if (pointer) {
        await response.body?.cancel();
        response = await fetchGitLfsObject(pointer, request);
      }
    }
  } catch (error) {
    console.error(error);
    return new Response("Game file could not be loaded.", { status: 502 });
  }

  if (response.status === 404) {
    return new Response("Game file not found.", { status: 404 });
  }
  if (!response.ok) {
    console.error(`Game file request failed with status ${response.status}.`);
    return new Response("Game file could not be loaded.", { status: 502 });
  }

  const responseHeaders = new Headers(response.headers);
  if (filename.toLowerCase().endsWith(".zip")) {
    responseHeaders.set("content-type", "application/zip");
    responseHeaders.set("content-disposition", `attachment; filename="${filename}"`);
  } else {
    responseHeaders.set("content-type", "text/html; charset=utf-8");
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("x-frame-options");
  }
  responseHeaders.set("cache-control", "public, max-age=3600");
  responseHeaders.set("x-content-type-options", "nosniff");

  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function handleGameFileRequest(
  request: Request,
  url: URL,
): Promise<Response | undefined> {
  if (url.pathname !== "/GAMES" && !url.pathname.startsWith("/GAMES/")) return;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const filename = getGameFilename(url.pathname);
  if (!filename) return new Response("Game file not found.", { status: 404 });
  return serveGameFile(request, filename);
}
