from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_ROOT = PROJECT_ROOT / "public"
GAMES_ROOT = (PROJECT_ROOT / "GAMES").resolve()
GAMES_PREFIX = "/GAMES"


class SiteHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        requested_path = unquote(urlsplit(path).path)

        if requested_path == GAMES_PREFIX or requested_path.startswith(
            f"{GAMES_PREFIX}/"
        ):
            relative_path = requested_path.removeprefix(GAMES_PREFIX).lstrip("/")
            resolved_path = (GAMES_ROOT / relative_path).resolve()

            if resolved_path == GAMES_ROOT or resolved_path.is_relative_to(GAMES_ROOT):
                return str(resolved_path)

            return str(GAMES_ROOT / "__not_found__")

        return super().translate_path(path)


server = ThreadingHTTPServer(
    ("127.0.0.1", 4173),
    partial(SiteHandler, directory=PUBLIC_ROOT),
)

print("Serving the site at http://localhost:4173/")
server.serve_forever()
