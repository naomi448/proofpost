/**
 * WizardConnect integration (hard requirement of BCH BLAZE 2026).
 *
 * Uses @wizardconnect/core (relay + connection URI) and @wizardconnect/dapp
 * (session + sign requests), exactly as documented at
 * docs.riftenlabs.com/wizardconnect/dapp:
 *
 *   const relay = initiateDappRelay(cb)  →  relay.qrUri shown as a QR code
 *   const mgr   = new DappConnectionManager("ProofPost")
 *   mgr.attachRelay(relay); mgr.updateConnection(...) on relay status
 *   mgr.on("walletready") → xpubs available; addresses derive locally
 *   mgr.signTransaction({ transaction, inputPaths }) → wallet signs
 *
 * Currently WizardConnect wallets = Paytaca mobile.
 *
 * The TIP flow builds a real BCH transaction from the connected wallet's
 * own UTXOs (found by scanning its derived receive addresses via the
 * Electrum provider), asks the wallet to sign + broadcast it via
 * signTransaction, and returns the resulting txid.
 */
import { initiateDappRelay } from "@wizardconnect/core";
import { DappConnectionManager } from "@wizardconnect/dapp";
import {
  binToHex,
  decodeCashAddress,
  encodeCashAddress,
  encodeTransaction,
  hash160,
  hash256,
  hexToBin,
  type Input,
  type Output,
  type Transaction,
} from "@bitauth/libauth";
import { NETWORK, TIP_SATS, demoAddress, explorerTxUrl } from "./config";
import { getDemoWallet } from "./demoWallet";

const RECEIVE = 0; // child index of the "receive" path
const SCAN_ADDRESSES = 15; // receive indices 0..14 are scanned for UTXOs
const DUST_LIMIT = 546n;

type StatusFn = (text: string) => void;

export class WizardConnect {
  private manager: DappConnectionManager | null = null;
  private relay: ReturnType<typeof initiateDappRelay> | null = null;
  connected = false;
  walletName: string | null = null;

  /** The connected wallet's first receive address (derived from its xpub). */
  receiveAddress(): string | null {
    const pub = this.manager?.getPubkey(RECEIVE, 0n);
    return pub ? pubkeyToCashaddr(pub) : null;
  }

  /**
   * Start the relay and hand the QR URI to the UI. Resolves once the wallet
   * has connected (walletready) — the promise stays pending while the user
   * scans, so callers should also wire the status callback for UX.
   */
  async connect(onQrUri: (uri: string) => void, onStatus: StatusFn): Promise<void> {
    if (this.manager) return;
    const manager = new DappConnectionManager("ProofPost");
    this.manager = manager;

    const relay = initiateDappRelay((payload) => {
      manager.updateConnection(payload.client, payload.status);
    });
    this.relay = relay;
    manager.attachRelay(relay);

    onQrUri(relay.qrUri || relay.uri);
    onStatus("Scan the QR code with Paytaca to connect…");

    await new Promise<void>((resolve) => {
      manager.on("walletready", (msg) => {
        this.connected = true;
        this.walletName = (msg as { wallet_name?: string }).wallet_name ?? "wallet";
        onStatus(`Connected: ${this.walletName}`);
        resolve();
      });
      manager.on("disconnect", (reason, message) => {
        this.connected = false;
        onStatus(`Disconnected (${reason}${message ? `: ${message}` : ""})`);
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.manager) return;
    try {
      this.manager.clearStoredSession();
      await this.manager.sendDisconnect("user disconnected from ProofPost");
    } catch {
      /* courtesy message only — ignore failures */
    }
    this.relay?.cleanup();
    this.manager = null;
    this.relay = null;
    this.connected = false;
    this.walletName = null;
  }

  /**
   * Tip the demo wallet TIP_SATS from the connected wallet.
   * Returns the broadcast transaction id.
   */
  async tipDemoWallet(onStatus: StatusFn): Promise<{ txid: string; explorerUrl: string }> {
    if (!this.manager || !this.connected) throw new Error("Connect a wallet first.");
    if (NETWORK !== "mainnet") throw new Error("Tips run on mainnet only.");

    onStatus("Looking up your wallet's balance…");
    const built = await this.buildTipTransaction();
    if (!built) throw new Error("No spendable BCH found on your connected wallet's receive addresses.");

    onStatus("Approve the tip in your wallet…");
    const response = await this.manager.signTransaction({
      transaction: {
        transaction: built.txHex,
        sourceOutputs: built.sourceOutputs,
        userPrompt: `Tip ProofPost demo wallet ${formatBch(TIP_SATS)} BCH`,
        broadcast: true,
      },
      inputPaths: built.inputPaths,
    });
    if (response.error) throw new Error(`Wallet refused: ${response.error}`);

    const txid = txidOfHex(response.signedTransaction);
    return { txid, explorerUrl: explorerTxUrl(txid) };
  }

  /** Build the unsigned tip transaction + WizardConnect source outputs. */
  private async buildTipTransaction(): Promise<{
    txHex: string;
    sourceOutputs: Array<Input & Output>;
    inputPaths: Array<[number, string, number]>;
  } | null> {
    const manager = this.manager!;
    // Reuse the demo wallet's Electrum provider (network-scoped, address-agnostic).
    const provider = (await getDemoWallet()).provider;

    interface Found {
      txid: string;
      vout: number;
      satoshis: bigint;
      addressIndex: number;
      lockingBytecode: Uint8Array;
    }
    const found: Found[] = [];
    for (let index = 0; index < SCAN_ADDRESSES; index++) {
      const pub = manager.getPubkey(RECEIVE, BigInt(index));
      if (!pub) continue;
      const address = pubkeyToCashaddr(pub);
      const utxos = await provider.getUtxos(address);
      for (const u of utxos) {
        if (u.token) continue; // plain BCH inputs only
        found.push({
          txid: u.txid,
          vout: u.vout,
          satoshis: u.satoshis,
          addressIndex: index,
          lockingBytecode: p2pkhLockingBytecode(pub),
        });
      }
    }
    if (found.length === 0) return null;

    // Largest-first coin selection with a generous fee estimate.
    found.sort((a, b) => (b.satoshis > a.satoshis ? 1 : -1));
    const selected: Found[] = [];
    let total = 0n;
    for (const coin of found) {
      selected.push(coin);
      total += coin.satoshis;
      const fee = 1000n + 250n * BigInt(selected.length);
      if (total >= TIP_SATS + fee) break;
    }
    const fee = 1000n + 250n * BigInt(selected.length);
    if (total < TIP_SATS + fee) return null;
    const change = total - TIP_SATS - fee;

    const changePub = manager.getPubkey(RECEIVE, 0n);
    if (!changePub) return null;

    const inputs: Input[] = selected.map((coin) => ({
      // libauth/serialization uses the internal (reversed) byte order for
      // outpoint hashes; Electrum reports display order, so reverse it.
      outpointTransactionHash: hexToBin(coin.txid).reverse(),
      outpointIndex: coin.vout,
      sequenceNumber: 0xffffffff,
      unlockingBytecode: new Uint8Array(0),
    }));

    const outputs: Output[] = [
      { lockingBytecode: cashaddrLockingBytecode(demoAddress()), valueSatoshis: TIP_SATS },
    ];
    if (change >= DUST_LIMIT) {
      outputs.push({ lockingBytecode: p2pkhLockingBytecode(changePub), valueSatoshis: change });
    } // else: dust change folds into the fee

    const transaction: Transaction = { version: 2, locktime: 0, inputs, outputs };
    const txHex = binToHex(encodeTransaction(transaction));

    const sourceOutputs = selected.map((coin, i) => ({
      ...inputs[i],
      lockingBytecode: coin.lockingBytecode,
      valueSatoshis: coin.satoshis,
    }));
    const inputPaths = selected.map(
      (coin, i) => [i, "receive", coin.addressIndex] as [number, string, number],
    );
    return { txHex, sourceOutputs, inputPaths };
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function pubkeyToCashaddr(pubkey: Uint8Array): string {
  const result = encodeCashAddress({
    prefix: "bitcoincash",
    type: "p2pkh",
    payload: hash160(pubkey),
  });
  if (typeof result === "string") throw new Error(`cashaddr encoding failed: ${result}`);
  return result.address;
}

function p2pkhLockingBytecode(pubkey: Uint8Array): Uint8Array {
  const hash = hash160(pubkey);
  const script = new Uint8Array(25);
  script.set([0x76, 0xa9, 0x14], 0); // OP_DUP OP_HASH160 OP_PUSH20
  script.set(hash, 3);
  script.set([0x88, 0xac], 23); // OP_EQUALVERIFY OP_CHECKSIG
  return script;
}

function cashaddrLockingBytecode(cashaddr: string): Uint8Array {
  const decoded = decodeCashAddress(cashaddr);
  if (typeof decoded === "string") throw new Error(`bad cashaddr: ${decoded}`);
  const payload = decoded.payload as Uint8Array;
  const script = new Uint8Array(25);
  script.set([0x76, 0xa9, 0x14], 0);
  script.set(payload, 3);
  script.set([0x88, 0xac], 23);
  return script;
}

function txidOfHex(txHex: string): string {
  const hash = hash256(hexToBin(txHex));
  return binToHex(Uint8Array.from(hash).reverse());
}

export function formatBch(satoshis: bigint): string {
  const whole = satoshis / 100_000_000n;
  const frac = (satoshis % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}
