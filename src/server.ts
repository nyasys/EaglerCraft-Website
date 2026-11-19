import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleGameFileRequest } from "./game-files";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

// quick hack to fix h3 swallowing errors in ssr, remove later maybe?
function checkH3Err(body: string): boolean {
  try {
    const p = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return p.unhandled === true && p.message === "HTTPError";
  } catch {
    return false;
  }
}

function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(res: Response): Promise<Response> {
  if (res.status < 500) return res;
  const cType = res.headers.get("content-type") ?? "";
  if (!cType.includes("application/json")) return res;
  const rawBody = await res.clone().text();
  if (!checkH3Err(rawBody)) return res;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${rawBody}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const gameResponse = await handleGameFileRequest(request, url);
    if (gameResponse) return gameResponse;
    try {
      const h = await getServerEntry();
      const r = await h.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(r);
    } catch (err) {
      console.error(err);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
