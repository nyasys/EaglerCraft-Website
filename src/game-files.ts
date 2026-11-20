const gameFilesUrl =
  "https://github.com/nyasys/EaglerCraft-Website/tree/main/GAMES";
const lfsBatchUrl =
  "https://github.com/nyasys/EaglerCraft-Website.git/info/lfs/objects/batch";

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

  const isValidFilename = /^[A-Za-z0-9._ -]+\.(html|zip)$/i.test(filename);
  if (!isValidFilename || filename.includes("/") || filename.includes("\\")) {
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
  const size = Number(match[2]);

  if (!oid || !Number.isSafeInteger(size)) return;

  return { oid, size };
}

async function fetchGitLfsObject(
  pointer: GitLfsPointer,
  request: Request,
): Promise<Response> {
  const batchResponse = await fetch(lfsBatchUrl, {
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

  if (!batchResponse.ok) {
    throw new Error(`LFS failed: ${batchResponse.status}`);
  }

  const payload = (await batchResponse.json()) as GitLfsBatchResponse;
  const downloadUrl = payload.objects?.[0]?.actions?.download?.href;

  if (!downloadUrl) {
    throw new Error("No LFS download URL");
  }

  const headers = new Headers();
  const range = request.headers.get("range");

  if (range) {
    headers.set("range", range);
  }

  return fetch(downloadUrl, {
    method: request.method,
    headers,
  });
}

async function serveGameFile(
  request: Request,
  filename: string,
): Promise<Response> {
  const headers = new Headers();
  const range = request.headers.get("range");

  if (range) {
    headers.set("range", range);
  }

  let response: Response;

  try {
    response = await fetch(
      `${gameFilesUrl}${encodeURIComponent(filename)}`,
      {
        method: request.method,
        headers,
      },
    );

    if (response.ok) {
      const contentLength = Number.parseInt(
        response.headers.get("content-length") || "0",
        10,
      );

      let pointer: GitLfsPointer | undefined;

      if (contentLength > 0 && contentLength < 500) {
        pointer = parseGitLfsPointer(await response.clone().text());
      }

      if (!pointer) {
        const probe = await fetch(
          `${gameFilesUrl}${encodeURIComponent(filename)}`,
          { headers: { range: "bytes=0-200" } },
        );

        if (probe.ok) {
          pointer = parseGitLfsPointer(await probe.text());
        }
      }

      if (pointer) {
        if (response.body) {
          await response.body.cancel();
        }

        response = await fetchGitLfsObject(pointer, request);
      }
    }
  } catch {
    return new Response("Game file could not be loaded.", { status: 502 });
  }

  if (response.status === 404) {
    return new Response("Game file not found.", { status: 404 });
  }

  if (!response.ok) {
    return new Response("Game file could not be loaded.", { status: 502 });
  }

  const responseHeaders = new Headers(response.headers);

  if (filename.toLowerCase().endsWith(".zip")) {
    responseHeaders.set("content-type", "application/zip");
    responseHeaders.set(
      "content-disposition",
      `attachment; filename="${filename}"`,
    );
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
  if (url.pathname !== "/GAMES" && !url.pathname.startsWith("/GAMES/")) {
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const filename = getGameFilename(url.pathname);

  if (!filename) {
    return new Response("Game file not found.", { status: 404 });
  }

  return serveGameFile(request, filename);
}
