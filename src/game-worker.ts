import { handleGameFileRequest } from "./game-files";

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const gameResponse = await handleGameFileRequest(request, new URL(request.url));
    if (gameResponse) return gameResponse;
    return env.ASSETS.fetch(request);
  },
};
