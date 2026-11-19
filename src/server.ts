export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Security: Prevent path traversal
    if (path.includes('..') || !path.startsWith('/GAMES/')) {
      return new Response("Not Found", { status: 404 });
    }

    // Map to the upstream GitHub raw content
    const upstreamBase = "https://raw.githubusercontent.com/nyasys/EaglerCraft-Website-2013-Style/refs/heads/main";
    let response = await fetch(`${upstreamBase}${path}`, {
      method: "GET",
      headers: request.headers
    });

    let body = await response.text();

    // 2. Git LFS Pointer Resolution
    // Check if the file is a Git LFS pointer (starts with 'version https://git-lfs')
    if (body.startsWith("version https://git-lfs.github.com/spec/v1")) {
      const oid = body.match(/oid sha256:([a-f0-9]+)/)?.[1];
      if (oid) {
        // Resolve LFS via GitHub API
        const lfsResponse = await fetch("https://github.com/nyasys/EaglerCraft-Website-2013-Style.git/info/lfs/objects/batch", {
          method: "POST",
          headers: {
            "Accept": "application/vnd.git-lfs+json",
            "Content-Type": "application/vnd.git-lfs+json",
          },
          body: JSON.stringify({
            operation: "download",
            transfers: ["basic"],
            objects: [{ oid }]
          })
        });
        
        const lfsData = await lfsResponse.json();
        const downloadUrl = lfsData.objects?.[0]?.actions?.download?.href;
        
        if (downloadUrl) {
          response = await fetch(downloadUrl);
          // Note: Do NOT use .text() here if the file is a large binary (like WASM)
          // For the sake of the HTML games in your test, we continue:
        }
      }
    }

    // 3. Header Normalization
    const newHeaders = new Headers(response.headers);
    
    // Remove headers that prevent embedding or execution in non-Chromium browsers
    newHeaders.delete("content-security-policy");
    newHeaders.delete("x-frame-options");

    // Force correct MIME types
    if (path.endsWith(".html")) {
      newHeaders.set("content-type", "text/html; charset=utf-8");
    } else if (path.endsWith(".zip")) {
      newHeaders.set("content-type", "application/zip");
      const filename = path.split('/').pop();
      newHeaders.set("content-disposition", `attachment; filename="${filename}"`);
    } else if (path.endsWith(".wasm")) {
      newHeaders.set("content-type", "application/wasm");
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }
};
