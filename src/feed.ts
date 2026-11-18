/**
 * Live feed of recent ProofPost stamps.
 *
 * Reads the demo address's transaction history over the SAME Electrum
 * connection the demo wallet already uses (mainnet-js provider), fetches
 * the raw transactions, decodes them with libauth, and keeps the ones
 * whose OP_RETURN output carries the "PPST" protocol id. No third-party
 * HTTP indexer, no API keys, no extra rate limits — if the wallet can
 * reach the BCH network, the feed works.
 */
import { decodeTransaction, hexToBin } from "@bitauth/libauth";
import { PROTOCOL_ID, demoAddress, explorerTxUrl } from "./config";
import { getDemoWallet } from "./demoWallet";
import { parseOpReturnPushes } from "./opreturn";

export interface Stamp {
  txid: string;
  message: string;
  /** Block height, or <= 0 while the transaction is still in the mempool. */
  height: number;
  explorerUrl: string;
}

const HISTORY_SCAN = 25; // how many recent transactions to inspect

export async function fetchRecentStamps(limit = 10): Promise<Stamp[]> {
  const wallet = await getDemoWallet();
  const provider = wallet.provider;

  const history = await provider.getHistory(demoAddress());
  if (history.length === 0) return [];

  // Newest first; unconfirmed (height <= 0) counts as newest.
  const key = (h: number) => (h > 0 ? h : Number.MAX_SAFE_INTEGER);
  const recent = [...history].sort((a, b) => key(b.height) - key(a.height)).slice(0, HISTORY_SCAN);
  const hashes = recent.map((h) => h.tx_hash);
  const heightOf = new Map(recent.map((h) => [h.tx_hash, h.height]));

  const rawByHash = await provider.getRawTransactions(hashes);
  const decoder = new TextDecoder("utf-8", { fatal: false });

  const stamps: Stamp[] = [];
  for (const hash of hashes) {
    const raw = rawByHash.get(hash);
    if (!raw) continue;
    const tx = decodeTransaction(hexToBin(raw));
    if (typeof tx === "string") continue; // decode error object
    for (const output of tx.outputs) {
      const pushes = parseOpReturnPushes(output.lockingBytecode);
      if (pushes && pushes.length >= 2 && decoder.decode(pushes[0]) === PROTOCOL_ID) {
        stamps.push({
          txid: hash,
          message: decoder.decode(pushes[1]),
          height: heightOf.get(hash) ?? 0,
          explorerUrl: explorerTxUrl(hash),
        });
        break; // one stamp per transaction
      }
    }
    if (stamps.length >= limit) break;
  }
  return stamps;
}
