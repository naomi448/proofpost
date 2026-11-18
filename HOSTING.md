# Hosting ProofPost — what to upload, where

ProofPost is a fully static site. The production build is already generated
in **`dist/`** (an `index.html` plus `dist/assets/`). Upload the **contents**
of `dist/` (not the folder itself) to any static host. No server, no
environment variables, no build step needed on the host — the demo wallet
config was baked in at build time.

## Easiest options (pick one)

### A. Netlify Drop (fastest, no account tooling)
1. Go to https://app.netlify.com/drop
2. Drag the `dist/` folder onto the page.
3. You get a live `https://<random-name>.netlify.app` URL in ~30 seconds.
4. (Optional) rename the site in Site settings for a nicer URL.

### B. GitHub Pages (good — the repo lives on GitHub anyway)
1. Push this repo to GitHub (public).
2. Either commit the `dist/` contents to a `gh-pages` branch, or use the
   `gh-pages` npm package: `npx gh-pages -d dist`.
3. Enable Pages in repo Settings → Pages (branch: gh-pages).
4. Live URL: `https://<user>.github.io/<repo>/`
   ⚠️ If the repo name is not the root, asset paths still work because the
   build uses relative-safe absolute paths from the domain root of the
   Pages site — if the demo is served under a subpath and assets 404,
   rebuild with `npx vite build --base=./` and re-upload.

### C. Vercel
1. `npx vercel deploy --prod` from the project root, or import the GitHub
   repo in the Vercel dashboard with **Output Directory = dist** and no
   build command (or build command `npm run build`).
2. Live URL: `https://<project>.vercel.app`

## After it's live — checklist for the parent/human

1. Open the URL: banner visible at top, network badge says MAINNET,
   demo address shown, balance line loads.
2. Fund the demo wallet (Yan's step): send **0.0005–0.001 BCH** from Trust
   Wallet to `bitcoincash:qzyvwn6q3m5jxk3znrh4p6ga6zhu44nt9qhwdmut5e`
   (scan the QR on the page). The "awaiting funds" note disappears and the
   stamp button activates once the balance lands.
3. Do 2–3 real stamps; confirm each txid opens on Blockchair and the feed
   picks the stamps up within ~a minute.
4. Fill the banner placeholders in `src/config.ts` (`BANNER_LINKS.slides`,
   `BANNER_LINKS.repo`), rebuild (`npm run build`), re-upload `dist/`.
5. Use the live URL in: the DoraHacks BUIDL, the Telegram confirmation
   post, and the slides (see `drafts/`).

## Notes
- The demo wallet key is inside the shipped JS bundle by design (dust-only
  demo wallet — see README "The demo wallet"). Keep its balance at dust.
- The page talks to public BCH Electrum servers from the visitor's browser
  (via mainnet-js). If a network blocks those, balance/feed/stamps pause —
  there is no project server in the middle to fix or to blame.
