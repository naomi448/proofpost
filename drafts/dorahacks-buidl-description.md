# DoraHacks BUIDL — ProofPost (paste-ready)

## Project name
ProofPost

## Tagline (one line)
Stamp a message permanently onto the Bitcoin Cash mainnet — real txid in seconds, for ~500 sats.

## Track
Mainnet Track

## Links (fill in at submission time)
- Live demo: [LIVE DEMO URL]
- GitHub: [GITHUB REPO URL]
- Presentation (Widget Factory slides): [SLIDES URL]
- CashTokens address for EMBER2026 votes: bitcoincash:zzyvwn6q3m5jxk3znrh4p6ga6zhu44nt9qsy79jdt2

## Full description

### What it does
ProofPost is a one-page web app that notarizes short messages on the Bitcoin Cash mainnet. Type a message, press "Stamp it", and within seconds the app broadcasts a real BCH mainnet transaction whose first output is an OP_RETURN carrying your text (`PPST` protocol id + message, the standard OP_RETURN convention). You get the actual txid with an explorer link — permanent, public, independently verifiable proof that this message existed at this moment, for a network fee of roughly 500 satoshis (~$0.002).

Below the stamp form, a live feed reads recent stamps back from the blockchain itself (over Electrum, decoding the raw transactions in the browser), proving the data really lives on-chain — not in our database. There is no database. There is no backend at all.

### The BCH mainnet feature (the requirement, literally)
The core feature of ProofPost *is* sending Bitcoin Cash mainnet transactions: every single stamp is a mainnet transaction, signed and broadcast in the browser by mainnet-js from a dedicated demo wallet (funded with dust only, ~0.0005–0.001 BCH, so hundreds of visitors can stamp for free). The WizardConnect tip flow additionally builds a transaction from the *visitor's own* wallet UTXOs and asks their wallet to sign it.

### Wallet connection — WizardConnect
ProofPost integrates WizardConnect (@wizardconnect/core + @wizardconnect/dapp, per the official Riften Labs docs): visitors connect Paytaca mobile by scanning a QR code, the dapp derives their receive addresses locally from the session xpubs, and the "Tip 0.0001 BCH" button constructs a real transaction and requests the signature via `signTransaction` with broadcast enabled. Keys never leave the visitor's wallet.

### Why BCH?
This app is only delightful on BCH: sub-cent fees make a ~500-sat permanent record economically sane, and 0-conf-friendly fast propagation makes "txid in seconds" true. On a high-fee chain a message notary is a toy; on BCH it's a product.

### Use cases
- Timestamped proof of authorship / priority ("I wrote this first")
- Public commitments, predictions, and bets with an unforgeable timestamp
- Love notes, memorials, event guestbooks — messages that outlive any platform
- A dead-simple demo of "why OP_RETURN + low fees matter" for BCH newcomers

### Tech used
- mainnet-js (browser) — demo-wallet signing/broadcast, Electrum network provider
- @bitauth/libauth — transaction building for the WizardConnect tip flow, address/script codecs
- @wizardconnect/core + @wizardconnect/dapp — wallet connection + sign requests (Paytaca)
- Vite + vanilla TypeScript — zero backend, static hosting
- Electrum network (via mainnet-js) — history + raw transactions for the live stamp feed
- OP_RETURN with a `PPST` protocol identifier, so other apps can find ProofPost stamps too

### Business angle
Freemium hosted stamping (custom protocol ids, verified profiles, team boards), paid archival certificates (PDF proof bundles), and an API for apps that need cheap, permanent, timestamped records. The demo wallet model can graduate to per-user WizardConnect-paid stamps, so the service never custodies funds.

### Notes for judges
- Late entry (joined during the submission window, low-priority queue per the FAQ) — thank you for looking anyway!
- Try it: fund state, balance and every stamp are live on mainnet; click any txid in the feed to verify on an explorer.
- The demo wallet is intentionally a dust-balance browser wallet (documented in the repo README) — that's what lets every visitor stamp for free; production would switch stamps to visitor-paid via the same WizardConnect flow the tip button already uses.

## Tech used (short field, if DoraHacks asks separately)
Bitcoin Cash mainnet, mainnet-js, @bitauth/libauth, WizardConnect (@wizardconnect/core, @wizardconnect/dapp), OP_RETURN, Electrum, CashTokens address for voting, Vite, TypeScript.
