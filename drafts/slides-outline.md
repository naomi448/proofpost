# Widget Factory slides — content outline for ProofPost

Yan: copy the official "Widget Factory" Google Slides template to your own
Google account, then paste the text below slide by slide (titles + bullets).
Set sharing to "anyone with the link", and give the link to Muse/your agent
so it can be wired into the demo page banner and the DoraHacks BUIDL.
Keep the template's design — only replace the words.

---

## Slide 1 — Title
**ProofPost 📮**
Stamp it on Bitcoin Cash. Forever.
BCH BLAZE 2026 · Mainnet Track · by listy (solo)

## Slide 2 — The problem
- Screenshots can be faked. Posts can be edited or deleted.
- Proving "I said this, at this time" usually means trusting a platform.
- Platforms die. Blockchains don't.

## Slide 3 — The solution
- ProofPost writes your message into a Bitcoin Cash **mainnet** transaction (OP_RETURN).
- You get a real txid in seconds — permanent, public, verifiable by anyone.
- Cost per stamp: ~500 sats (≈ $0.002). No account, no sign-up.

## Slide 4 — How it works
1. Type a message (max 180 characters).
2. The app builds an OP_RETURN output: `PPST` + your text.
3. mainnet-js signs & broadcasts from a dust-funded demo wallet.
4. Txid + explorer link instantly; the live feed reads stamps back from the chain itself.

## Slide 5 — Wallet connection (WizardConnect)
- Visitors connect their own wallet with **WizardConnect** (Paytaca mobile, QR scan).
- "Tip 0.0001 BCH" builds a real transaction from the visitor's UTXOs and asks their wallet to sign — keys never leave the wallet.
- Same flow can power visitor-paid stamps in production.

## Slide 6 — Why Bitcoin Cash?
- Sub-cent fees make permanent records economically sane.
- Fast propagation → "txid in seconds" is real.
- CashTokens-ready: our EMBER2026 voting address is a token address of the demo wallet.

## Slide 7 — Who it's for / use cases
- Creators proving authorship & priority
- Public predictions, commitments, friendly bets
- Love notes, memorials, event guestbooks
- The simplest possible "aha!" demo for BCH newcomers

## Slide 8 — Business potential
- Freemium: custom protocol ids, verified profiles, team boards
- Paid PDF proof certificates & archival API
- Per-stamp micro-fees via WizardConnect — non-custodial by design

## Slide 9 — Try it
- Live demo: [DEMO URL]
- Code: [GITHUB URL]
- Vote EMBER2026: bitcoincash:zzyvwn6q3m5jxk3znrh4p6ga6zhu44nt9qsy79jdt2
- Thank you! 🔥
