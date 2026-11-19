import { handleGameFileRequest } from "./game-files";

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const gameResponse = await handleGameFileRequest(request, url);

    if (gameResponse) {
      return gameResponse;
    }

    return env.ASSETS.fetch(request);
  },
};
