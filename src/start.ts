import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// TODO: fix this later when tanstack start updates types
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    // let status codes bubble up
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    console.error(err);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
