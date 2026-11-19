const playNow = document.querySelector("
const picker = document.querySelector("
const closeButton = picker.querySelector(".game-picker-close");
const search = document.querySelector("
const status = document.querySelector("
const list = document.querySelector("
const emptyMessage = document.querySelector("

let games = [];

function renderGames(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const matchingGames = games.filter((game) =>
    `${game.label} ${game.file}`.toLowerCase().includes(normalizedQuery),
  );
  const fragment = document.createDocumentFragment();

  for (const game of matchingGames) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const label = document.createElement("span");
    const kind = document.createElement("small");

    link.href = `/GAMES/${encodeURIComponent(game.file)}`;
    label.textContent = game.label;
    kind.textContent = game.type === "zip" ? "Download" : "Play";
    if (game.type === "zip") {
      link.download = game.file;
    }

    link.append(label, kind);
    item.append(link);
    fragment.append(item);
  }

  list.replaceChildren(fragment);
  status.textContent = `${matchingGames.length} of ${games.length} items`;
  emptyMessage.hidden = matchingGames.length > 0;
}

playNow.addEventListener("click", async (event) => {
  event.preventDefault();
  picker.showModal();
  search.focus();

  if (games.length > 0) {
    return;
  }

  try {
    const response = await fetch("/games.json");
    if (!response.ok) {
      throw new Error(`Could not load the game list (${response.status}).`);
    }
    games = await response.json();
    renderGames(search.value);
  } catch (error) {
    status.textContent = "Games and clients could not be loaded.";
    console.error(error);
  }
});

search.addEventListener("input", () => renderGames(search.value));
closeButton.addEventListener("click", () => picker.close());
picker.addEventListener("click", (event) => {
  if (event.target === picker) {
    picker.close();
  }
});
