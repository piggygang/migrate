import { CLUSTER } from "@/lib/cluster";

/**
 * Cluster-scoped: a localhost or free-tier devnet override must not survive a
 * flip to mainnet-beta (or vice versa) — an endpoint on the wrong cluster
 * fails in the most confusing way possible, at blockhash time.
 */
const KEY = `piggy.rpc-endpoint.${CLUSTER}`;

/**
 * `||`, never `??`: Next inlines an empty NEXT_PUBLIC_ assignment as "", which
 * `??` keeps, and every RPC call would then hit this app's own origin.
 */
const configured = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";

// Only devnet ships a default, so a devnet build needs no environment at all.
// No mainnet endpoint lives in this repo: a key belongs in the environment, and
// the public endpoint refuses browser traffic, so the build stops here instead.
if (CLUSTER === "mainnet-beta" && !configured) {
  throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL must be set when NEXT_PUBLIC_SOLANA_CLUSTER is mainnet-beta");
}

export const DEFAULT_ENDPOINT = configured || "https://api.devnet.solana.com";

export function isValidEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function readOverride(): string {
  // localStorage throws outright when the browser blocks storage, rather than
  // returning null, so every access is guarded.
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeOverride(value: string): void {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* A holder who blocks storage just falls back to the default. */
  }
}
