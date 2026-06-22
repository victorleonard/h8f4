import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";
import { loadEnv } from "vite";

/** Ex. `/h8f4/` pour un déploiement en sous-dossier ; `/` à la racine du domaine. */
function normalizeBase(path) {
  if (!path || path === "/") return "/";
  let base = path.startsWith("/") ? path : `/${path}`;
  if (!base.endsWith("/")) base += "/";
  return base;
}

const env = loadEnv(process.env.MODE ?? "production", process.cwd(), "");
const base = normalizeBase(
  env.PUBLIC_BASE_PATH ?? process.env.PUBLIC_BASE_PATH,
);
const noindex = (env.PUBLIC_NOINDEX ?? process.env.PUBLIC_NOINDEX) === "true";

export default defineConfig({
  site: env.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? "https://h8f4.fr",
  base,
  adapter: node({ mode: "standalone" }),
  vite: {
    ssr: {
      external: ["better-sqlite3"],
    },
  },
  integrations: [
    tailwind(),
    ...(noindex
      ? []
      : [
          sitemap({
            filter: (page) => !page.includes("/propal"),
          }),
        ]),
  ],
});
