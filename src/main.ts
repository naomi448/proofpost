import QRCode from "qrcode";
import "./style.css";
import {
  BANNER_LINKS,
  MAX_MESSAGE_CHARS,
  NETWORK,
  demoAddress,
  demoTokenAddress,
  explorerAddressUrl,
} from "./config";
import { getBalanceSats, stampMessage } from "./demoWallet";
import { fetchRecentStamps } from "./feed";
import { WizardConnect, formatBch } from "./wizard";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  bannerSlides: $<HTMLAnchorElement>("banner-slides"),
  bannerRepo: $<HTMLAnchorElement>("banner-repo"),
  bannerToken: $<HTMLElement>("banner-token-address"),
  bannerCopyToken: $<HTMLButtonElement>("banner-copy-token"),
  networkBadge: $<HTMLElement>("network-badge"),
  demoAddress: $<HTMLElement>("demo-address"),
  copyAddress: $<HTMLButtonElement>("copy-address"),
  fundQr: $<HTMLCanvasElement>("fund-qr"),
  demoBalance: $<HTMLElement>("demo-balance"),
  refreshBalance: $<HTMLButtonElement>("refresh-balance"),
  fundingNote: $<HTMLElement>("funding-note"),
  messageInput: $<HTMLTextAreaElement>("message-input"),
  charCounter: $<HTMLElement>("char-counter"),
  stampButton: $<HTMLButtonElement>("stamp-button"),
  stampStatus: $<HTMLElement>("stamp-status"),
  stampResult: $<HTMLElement>("stamp-result"),
  stampTxLink: $<HTMLAnchorElement>("stamp-tx-link"),
  stampTxid: $<HTMLElement>("stamp-txid"),
  feedStatus: $<HTMLElement>("feed-status"),
  feedList: $<HTMLUListElement>("feed-list"),
  refreshFeed: $<HTMLButtonElement>("refresh-feed"),
  connectButton: $<HTMLButtonElement>("connect-button"),
  tipButton: $<HTMLButtonElement>("tip-button"),
  connectStatus: $<HTMLElement>("connect-status"),
  tipResult: $<HTMLElement>("tip-result"),
  tipTxLink: $<HTMLAnchorElement>("tip-tx-link"),
  tipTxid: $<HTMLElement>("tip-txid"),
  qrDialog: $<HTMLElement>("qr-dialog"),
  wizardQr: $<HTMLCanvasElement>("wizard-qr"),
  wizardUri: $<HTMLElement>("wizard-uri"),
  qrClose: $<HTMLButtonElement>("qr-close"),
};

// ── Banner (BCH BLAZE requirement) ─────────────────────────────────────────
els.bannerSlides.href = BANNER_LINKS.slides;
els.bannerRepo.href = BANNER_LINKS.repo;
els.bannerToken.textContent = demoTokenAddress();
els.bannerCopyToken.addEventListener("click", () => copyText(demoTokenAddress(), els.bannerCopyToken));

// ── Static page info ───────────────────────────────────────────────────────
els.networkBadge.textContent = NETWORK;
els.demoAddress.textContent = demoAddress();
els.demoAddress.title = explorerAddressUrl(demoAddress());
els.copyAddress.addEventListener("click", () => copyText(demoAddress(), els.copyAddress));
QRCode.toCanvas(els.fundQr, demoAddress(), { width: 120, margin: 1 }).catch(() => {
  els.fundQr.style.display = "none";
});

function copyText(text: string, button: HTMLButtonElement) {
  navigator.clipboard?.writeText(text).then(
    () => {
      const old = button.textContent;
      button.textContent = "copied ✓";
      setTimeout(() => (button.textContent = old), 1500);
    },
    () => undefined,
  );
}

// ── Balance / funding state ────────────────────────────────────────────────
async function refreshBalance() {
  els.demoBalance.textContent = "…";
  try {
    const sats = await getBalanceSats();
    els.demoBalance.textContent = `${formatBch(sats)} BCH (${sats.toLocaleString()} sats)`;
    const funded = sats > 1_000n; // enough for at least one stamp + fee
    els.fundingNote.hidden = funded;
    els.stampButton.disabled = !funded;
    els.stampButton.textContent = funded ? "Stamp it on-chain 🔥" : "Waiting for demo funds…";
    return funded;
  } catch (err) {
    els.demoBalance.textContent = "unavailable";
    els.fundingNote.hidden = false;
    els.fundingNote.textContent =
      "⚠️ Could not reach the BCH network to check the demo wallet balance. " +
      "Stamping activates automatically once the wallet is funded and reachable.";
    els.stampButton.disabled = true;
    return false;
  }
}
els.refreshBalance.addEventListener("click", refreshBalance);

// ── Stamping ───────────────────────────────────────────────────────────────
els.messageInput.addEventListener("input", () => {
  const len = els.messageInput.value.length;
  els.charCounter.textContent = `${len} / ${MAX_MESSAGE_CHARS}`;
});

els.stampButton.addEventListener("click", async () => {
  const message = els.messageInput.value.trim();
  els.stampStatus.classList.remove("error");
  els.stampResult.hidden = true;
  if (!message) {
    els.stampStatus.textContent = "Write a message first.";
    els.stampStatus.classList.add("error");
    return;
  }
  if (new TextEncoder().encode(message).length > 200) {
    els.stampStatus.textContent = "That message is too long in bytes (lots of emoji?) — shorten it a little.";
    els.stampStatus.classList.add("error");
    return;
  }
  els.stampButton.disabled = true;
  els.stampStatus.textContent = "Broadcasting to Bitcoin Cash mainnet…";
  try {
    const { txid, explorerUrl } = await stampMessage(message);
    els.stampTxid.textContent = txid;
    els.stampTxLink.href = explorerUrl;
    els.stampResult.hidden = false;
    els.stampStatus.textContent = "Confirmed by the network — it's on-chain forever.";
    els.messageInput.value = "";
    els.charCounter.textContent = `0 / ${MAX_MESSAGE_CHARS}`;
    setTimeout(() => {
      refreshBalance();
      refreshFeed();
    }, 4000);
  } catch (err) {
    els.stampStatus.textContent =
      "Stamping failed: " + (err instanceof Error ? err.message : String(err));
    els.stampStatus.classList.add("error");
  } finally {
    refreshBalance();
  }
});

// ── Live feed ──────────────────────────────────────────────────────────────
async function refreshFeed() {
  try {
    const stamps = await fetchRecentStamps(10);
    els.feedList.innerHTML = "";
    if (stamps.length === 0) {
      els.feedStatus.textContent = "No stamps yet — be the first!";
      return;
    }
    els.feedStatus.textContent = `Latest ${stamps.length} stamp${stamps.length > 1 ? "s" : ""}, read straight from the blockchain:`;
    for (const stamp of stamps) {
      const li = document.createElement("li");
      const msg = document.createElement("div");
      msg.className = "feed-msg";
      msg.textContent = stamp.message;
      const meta = document.createElement("div");
      meta.className = "feed-meta";
      const when = stamp.height > 0 ? `block ${stamp.height.toLocaleString()}` : "in the mempool";
      meta.innerHTML = `${when} · tx <a href="${stamp.explorerUrl}" target="_blank" rel="noopener"><code></code></a>`;
      meta.querySelector("code")!.textContent = stamp.txid.slice(0, 16) + "…";
      li.append(msg, meta);
      els.feedList.append(li);
    }
  } catch {
    els.feedStatus.textContent = "Feed temporarily unavailable (network hiccup) — try refresh in a moment.";
  }
}
els.refreshFeed.addEventListener("click", refreshFeed);

// ── WizardConnect ──────────────────────────────────────────────────────────
const wizard = new WizardConnect();

els.connectButton.addEventListener("click", async () => {
  if (wizard.connected) {
    await wizard.disconnect();
    els.connectStatus.textContent = "Not connected.";
    els.connectButton.textContent = "Connect wallet";
    els.tipButton.disabled = true;
    return;
  }
  els.connectButton.disabled = true;
  try {
    await wizard.connect(
      (uri) => {
        els.wizardUri.textContent = uri;
        els.qrDialog.hidden = false;
        QRCode.toCanvas(els.wizardQr, uri, { width: 224, margin: 1 }).catch(() => undefined);
      },
      (text) => {
        els.connectStatus.textContent = text;
      },
    );
    els.qrDialog.hidden = true;
    els.connectButton.textContent = "Disconnect";
    els.tipButton.disabled = NETWORK !== "mainnet";
    const address = wizard.receiveAddress();
    els.connectStatus.textContent =
      `Connected${wizard.walletName ? ` (${wizard.walletName})` : ""}` +
      (address ? ` — ${address}` : "");
  } catch (err) {
    els.connectStatus.textContent =
      "Connection failed: " + (err instanceof Error ? err.message : String(err));
    els.connectStatus.classList.add("error");
  } finally {
    els.connectButton.disabled = false;
  }
});
els.qrClose.addEventListener("click", () => (els.qrDialog.hidden = true));

els.tipButton.addEventListener("click", async () => {
  els.tipButton.disabled = true;
  els.tipResult.hidden = true;
  try {
    const { txid, explorerUrl } = await wizard.tipDemoWallet((text) => {
      els.connectStatus.textContent = text;
    });
    els.tipTxid.textContent = txid;
    els.tipTxLink.href = explorerUrl;
    els.tipResult.hidden = false;
    els.connectStatus.textContent = "Tip sent — thank you! 🙏";
    setTimeout(refreshBalance, 3000);
  } catch (err) {
    els.connectStatus.textContent =
      "Tip failed: " + (err instanceof Error ? err.message : String(err));
    els.connectStatus.classList.add("error");
  } finally {
    els.tipButton.disabled = !wizard.connected || NETWORK !== "mainnet";
  }
});

// ── Boot ───────────────────────────────────────────────────────────────────
refreshBalance();
refreshFeed();
setInterval(refreshFeed, 45_000);
