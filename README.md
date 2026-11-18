# 📮 ProofPost

**Stamp a message permanently onto the Bitcoin Cash mainnet — real txid in seconds, for ~500 sats.**

ProofPost is a one-page web app built for **BCH BLAZE 2026** (Mainnet Track). Type a short message, press the button, and the app broadcasts a real BCH mainnet transaction whose first output is an `OP_RETURN` carrying your text. A live feed below reads recent stamps back from the blockchain itself. No accounts, no backend, no database, no smart contracts.

## How it works

1. **Stamp** — Your message goes into an OP_RETURN output using the standard layout `OP_RETURN <"PPST"> <message>` (protocol id first, so other apps can find ProofPost stamps). The transaction is signed and broadcast in the browser by [mainnet-js](https://mainnet.cash) from a dedicated **demo wallet**, and costs only the miner fee (~350–500 sats). You immediately get the txid + explorer link.
2. **Feed** — Recent stamps are read back from the chain over the same Electrum connection the wallet uses: the app fetches the demo address's transaction history plus the raw transactions via the mainnet-js provider, decodes every OP_RETURN output with libauth, and lists the ones carrying the `PPST` protocol id. No third-party indexer or API key involved. What you see is what's on-chain — verifiable by clicking any txid.
3. **Tip (WizardConnect)** — Visitors can connect their own BCH wallet via [WizardConnect](https://docs.riftenlabs.com/wizardconnect) (Paytaca mobile, QR scan) and tip the demo wallet 0.0001 BCH. The app derives the visitor's receive addresses from the session xpubs, builds a real transaction from their UTXOs with libauth, and asks the wallet to sign + broadcast via `signTransaction`. Keys never leave the visitor's wallet.

## The demo wallet (read this)

Stamps are free for visitors because a **fresh, demo-only wallet** pays the fees:

- Generated solely for this demo by `scripts/gen-wallet.mjs`; its WIF lives in a local `.env` (mode 600, gitignored) and is inlined into the browser build at build time.
- It must only ever hold **dust** (~0.0005–0.001 BCH ≈ a few cents — enough for hundreds of stamps).
- This is an intentional, documented trade-off for a hackathon demo so judges can stamp with zero setup. A production version would charge stamps to the visitor's own wallet through the exact WizardConnect flow the tip button already uses.
- **Never** reuse this wallet for real funds, and never put a personal wallet's key in `.env`.

Public demo addresses (safe to share):

| | Address |
|---|---|
| Mainnet | `bitcoincash:qzyvwn6q3m5jxk3znrh4p6ga6zhu44nt9qhwdmut5e` |
| Mainnet (CashTokens, EMBER2026 votes) | `bitcoincash:zzyvwn6q3m5jxk3znrh4p6ga6zhu44nt9qsy79jdt2` |
| Testnet | `bchtest:qzyvwn6q3m5jxk3znrh4p6ga6zhu44nt9qnufu7un9` |

If the balance hits zero the page shows a clear "demo wallet awaiting funds" state and disables stamping until it's topped up.

## Networks

`src/config.ts` has a single switch:

```ts
export const NETWORK: "mainnet" | "testnet" = "mainnet";
```

Flip it to `"testnet"` for development (the same key, testnet WIF from `.env`, is used). Everything else — wallet class, feed, explorer links, WizardConnect — follows that one value.

## Run it

```bash
npm install
node scripts/gen-wallet.mjs   # once — creates .env with a fresh demo wallet
npm run dev                   # local dev server
npm run build                 # static build → dist/
npm run verify                # offline OP_RETURN + wallet verification suite
```

Hosting: upload the **contents of `dist/`** to any static host — see `HOSTING.md`.

## Project layout

```
index.html            page + required BCH BLAZE top banner (3 links)
src/config.ts         NETWORK switch, addresses, banner link placeholders
src/demoWallet.ts     demo wallet init, balance, stampMessage()
src/feed.ts           live stamp feed (Electrum history + raw txs, libauth decode)
src/opreturn.ts       OP_RETURN push-data parser (used by the feed)
src/wizard.ts         WizardConnect connect + tip transaction builder
src/main.ts           UI wiring
scripts/gen-wallet.mjs    generates the demo wallet → .env (never prints secrets)
scripts/verify-opreturn.mjs  offline verification of the stamp format
drafts/               paste-ready texts (BUIDL description, Telegram post, slides)
```

## BCH BLAZE banner placeholders

The top banner links are configured in `src/config.ts` (`BANNER_LINKS`). Two are placeholders that must be replaced with real URLs before submission: the Widget Factory slides link and this repo's public GitHub URL. The third — the CashTokens address for EMBER2026 votes — is real.

## License

MIT
