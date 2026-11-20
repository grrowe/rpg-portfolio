// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // TODO: confirm the production domain. Used for canonical URLs, Open Graph and the sitemap.
  site: "https://grahamrowe.dev",

  // Old routes from the React site, so existing links and search results still land somewhere useful.
  // In a static build these become small meta-refresh pages. For real 301s, also add the nginx
  // rules from the README.
  redirects: {
    "/my-creds": "/#quest-log",
    "/projects": "/#quest-log",
    "/contact": "/#tavern",
    "/about": "/",
  },
});
