export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>This page didn't load</title>
    <style>
      body {
        display: grid;
        min-height: 100vh;
        place-items: center;
        margin: 0;
        padding: 1.5rem;
        background: #fafafa;
        color: #111;
        font: 15px/1.5 system-ui, -apple-system, sans-serif;
      }

      .card {
        width: 100%;
        max-width: 28rem;
        padding: 2rem;
        text-align: center;
      }

      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.25rem;
      }

      p {
        margin: 0 0 1.5rem;
        color: #4b5563;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
      }

      a,
      button {
        padding: 0.5rem 1rem;
        border: 1px solid transparent;
        border-radius: 0.375rem;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
      }

      .primary {
        background: #111;
        color: #fff;
      }

      .secondary {
        border-color: #d1d5db;
        background: #fff;
        color: #111;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>This page didn't load</h1>
      <p>
        Something went wrong on our end. You can try refreshing or head back
        home.
      </p>
      <div class="actions">
        <button class="primary" type="button" onclick="location.reload()">
          Try again
        </button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </main>
  </body>
</html>`;
}
