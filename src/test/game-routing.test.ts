import { afterEach, describe, expect, it, vi } from "vitest";

import server from "../server";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("game file routing", () => {
  it("serves HTML game files with an executable content type", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<!doctype html>", {
          headers: { "content-type": "text/plain" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await server.fetch(
      new Request("https://site.test/GAMES/Chromium%20Client.html"),
      {},
      {},
    );

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toBe("<!doctype html>");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/nyasys/EaglerCraft-Website-2013-Style/refs/heads/main/GAMES/Chromium%20Client.html",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("resolves Git LFS pointers to the actual HTML file", async () => {
    const pointer =
      "version https://git-lfs.github.com/spec/v1\noid sha256:85dbbc0a467830ee599cc731aad6c2fe671a27cb6e3dec97bad84c7d720c46c3\nsize 100391663\n";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(pointer, { headers: { "content-length": String(pointer.length) } }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            objects: [
              {
                actions: { download: { href: "https://github-cloud.githubusercontent.com/file" } },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response("<!doctype html>"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await server.fetch(
      new Request("https://site.test/GAMES/Chromium%20Client.html"),
      {},
      {},
    );

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toBe("<!doctype html>");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("finds Git LFS pointers when the upstream omits Content-Length", async () => {
    const pointer =
      "version https://git-lfs.github.com/spec/v1\noid sha256:85dbbc0a467830ee599cc731aad6c2fe671a27cb6e3dec97bad84c7d720c46c3\nsize 100391663\n";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(pointer))
      .mockResolvedValueOnce(new Response(pointer))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            objects: [
              {
                actions: { download: { href: "https://github-cloud.githubusercontent.com/file" } },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response("<!doctype html>"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await server.fetch(
      new Request("https://site.test/GAMES/Chromium%20Client.html"),
      {},
      {},
    );

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toBe("<!doctype html>");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps ZIP game files as downloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("archive")),
    );

    const response = await server.fetch(
      new Request("https://site.test/GAMES/beta-1.0.zip"),
      {},
      {},
    );

    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="beta-1.0.zip"');
  });

  it("rejects paths outside the game file list shape", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await server.fetch(
      new Request("https://site.test/GAMES/%2e%2e%2Fsecret.html"),
      {},
      {},
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
