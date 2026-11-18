import { defineConfig } from "vite";

// Static single-page build. Output in dist/ — upload the *contents* of dist/
// to any static host (GitHub Pages, Netlify, Vercel). See HOSTING.md.
export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
  },
});
