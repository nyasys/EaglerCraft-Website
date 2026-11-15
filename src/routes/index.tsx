import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { bodyHtml } from "@/lib/mc2013-body";

const description =
  "Explore EaglerCraft, play Minecraft directly in your browser, and discover the history, origins, and evolution of EaglerCraft.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EaglerCraft" },
      { name: "description", content: description },
      { property: "og:title", content: "EaglerCraft" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "/stylesheets/style.css" }],
  }),
  component: Index,
});

const scripts = [
  "/javascripts/libs/modernizr.min.js",
  "/javascripts/libs/json2.js",
  "/javascripts/libs/jquery-4.0.0.min.js",
  "/javascripts/libs/jquery-migrate-4.0.2.min.js",
  "/javascripts/libs/jquery-legacy-compat.js",
  "/javascripts/libs/jquery.dataTables.min.js",
  "/javascripts/libs/jquery.timeago.js",
  "/javascripts/libs/sammy.js",
  "/javascripts/plugins.js",
  "/javascripts/main.js",
];

function loadScriptsInOrder(index = 0) {
  const src = scripts[index];
  if (!src) return;

  const script = document.createElement("script");
  script.src = src;
  script.dataset["siteScript"] = "true";

  const loadNext = () => loadScriptsInOrder(index + 1);
  script.addEventListener("load", loadNext, { once: true });
  script.addEventListener(
    "error",
    () => {
      console.error(`Could not load site script: ${src}`);
      loadNext();
    },
    { once: true },
  );
  document.body.append(script);
}

function Index() {
  useEffect(() => {
    if (!document.querySelector("script[data-site-script]")) {
      loadScriptsInOrder();
    }
  }, []);

  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
