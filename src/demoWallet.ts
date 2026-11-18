/**
 * The ProofPost demo wallet — a FRESH, demo-only wallet whose key lives in
 * .env (Vite inlines it at build time). It only ever holds dust
 * (~0.0005–0.001 BCH), which is what makes browser-side signing acceptable
 * here. It is NOT anyone's personal wallet.
 */
import { Wallet, TestNetWallet, OpReturnData } from "mainnet-js";
import { NETWORK, PROTOCOL_ID, explorerTxUrl } from "./config";

type AnyWallet = InstanceType<typeof Wallet>;

let walletPromise: Promise<AnyWallet> | null = null;

export function getDemoWallet(): Promise<AnyWallet> {
  if (!walletPromise) {
    walletPromise = (async () => {
      if (NETWORK === "mainnet") {
        const wif = import.meta.env.VITE_DEMO_WIF_MAINNET as string | undefined;
        if (!wif) throw new Error("VITE_DEMO_WIF_MAINNET is not set — see README (.env setup).");
        return (await Wallet.fromWIF(wif)) as AnyWallet;
      }
      const wif = import.meta.env.VITE_DEMO_WIF_TESTNET as string | undefined;
      if (!wif) throw new Error("VITE_DEMO_WIF_TESTNET is not set — see README (.env setup).");
      return (await TestNetWallet.fromWIF(wif)) as AnyWallet;
    })();
  }
  return walletPromise;
}

/** Current demo-wallet balance in satoshis (0n while unfunded). */
export async function getBalanceSats(): Promise<bigint> {
  const wallet = await getDemoWallet();
  return wallet.getBalance();
}

export interface StampResult {
  txid: string;
  explorerUrl: string;
}

/**
 * Stamp a message onto the chain: broadcasts a transaction whose first
 * output is OP_RETURN <"PPST"> <message>. Costs only the miner fee
 * (~350–500 sats). Resolves with the real txid seconds after broadcast.
 */
export async function stampMessage(message: string): Promise<StampResult> {
  const wallet = await getDemoWallet();
  const payload = OpReturnData.fromArray([PROTOCOL_ID, message]);
  const response = await wallet.send(payload);
  if (!response.txId) {
    throw new Error("Broadcast returned no transaction id.");
  }
  return { txid: response.txId, explorerUrl: explorerTxUrl(response.txId) };
}
