import type { Role } from "@/lib/pairs";
import type { OtherReason, Verdict } from "@/lib/rules";

/**
 * What the picker knows about a wallet, and the one request that fetches it.
 * The shape is this app's own: the route behind it joins the index's answer
 * with the server-only mint map and lib/rules.ts.
 */

/** One Piggy SOL Gang in the wallet. */
export type Piggy = {
  mint: string;
  /** The `#N` in its name, or null when the name carries none. */
  number: number | null;
  name: string;
  /** Today's art, from the index. Null when it has none or its host is dead. */
  image: string | null;
  /** The Piggy Gang art id it becomes, from the mint map. Null when it has none. */
  artId: string | null;
  /** Whether it may be upgraded and whether it may be burned, and why not. */
  verdict: Record<Role, Verdict>;
};

/** Another collection in the same wallet, and why it sits out of a swap. */
export type OtherHolding = { name: string; count: number; reason: OtherReason };

export type WalletPiggies = {
  /** Ordered by number. */
  piggies: Piggy[];
  others: OtherHolding[];
  /** The read stopped at its page cap, so some piggies may be missing. */
  truncated: boolean;
};

/** The error codes the route answers with. Switch on these, never on wording. */
export type PiggiesErrorCode = "invalid_address" | "indexer_unavailable";

/** How a piggy is named on screen: its number, as the holder knows it. */
export const labelOf = (piggy: Pick<Piggy, "number" | "name" | "mint">) =>
  piggy.number !== null ? `#${piggy.number}` : piggy.name || `${piggy.mint.slice(0, 4)}…${piggy.mint.slice(-4)}`;

const MESSAGES: Record<PiggiesErrorCode, string> = {
  invalid_address: "That isn't a Solana wallet address.",
  indexer_unavailable: "The piggy index isn't answering right now. Try again in a moment.",
};

/**
 * A wallet's piggies. Rejects with a message fit to show a holder; an abort
 * rejects with the abort's own reason so callers can tell it apart.
 */
export async function fetchWalletPiggies(address: string, signal?: AbortSignal): Promise<WalletPiggies> {
  let response: Response;
  try {
    response = await fetch(`/api/wallets/${encodeURIComponent(address)}/piggies`, {
      signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error("Couldn't reach Piggy Migration. Check your connection and try again.");
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Handled below: a body that is not JSON is a failure either way.
  }

  if (!response.ok || !body || typeof body !== "object" || !Array.isArray((body as WalletPiggies).piggies)) {
    const code = (body as { error?: unknown } | null)?.error;
    throw new Error(
      typeof code === "string" && code in MESSAGES
        ? MESSAGES[code as PiggiesErrorCode]
        : "Couldn't read this wallet's piggies. Try again.",
    );
  }
  return body as WalletPiggies;
}
