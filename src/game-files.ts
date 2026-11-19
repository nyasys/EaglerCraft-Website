ts
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
      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      
      let pointer: GitLfsPointer | undefined;

      // FIX: Only call .text() if the file is small enough to actually be a pointer.
      // Git LFS pointers are typically aounrd: 130 bytes. I use 500 it's safe.
      if (contentLength > 0 && contentLength < 500) {
        pointer = parseGitLfsPointer(await response.clone().text());
      } 
      
      
      if (!pointer) {
        const probe = await fetch(`${gameFilesUrl}${encodeURIComponent(filename)}`, {
          headers: { range: "bytes=0-200" },
        });
        // We only check the probe if it's actually small (which a range request will be)
        if (probe.ok) {
          pointer = parseGitLfsPointer(await probe.text());
        }
      }

      if (pointer) {
        // Use body.cancel() to cleanly close the connection to the pointer file
        if (response.body) await response.body.cancel();
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
  
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
