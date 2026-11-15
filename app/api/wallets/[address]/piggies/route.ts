import type { NextRequest } from "next/server";
import { isAddress } from "@/lib/base58";
import { IndexerError, readWallet, type WalletRead } from "@/lib/indexer";
import { artIdOf } from "@/lib/mint-map";
import type { Piggy, PiggiesErrorCode, WalletPiggies } from "@/lib/piggies";
import { SWAP_COLLECTION, otherReason, verdicts } from "@/lib/rules";

/**
 * A wallet's Piggy SOL Gang for the picker: the index says which piggies the
 * wallet holds, the mint map says what each becomes, lib/rules.ts says what
 * each may do. Here rather than in the browser because the mint map is 700 KB
 * and server-only.
 *
 * Read-only and unauthenticated, like the index it reads: nothing here is
 * secret, and nothing here signs. Answers are never cached, so a refresh after
 * a swap sees the burn.
 */

/** Well under any platform limit, and long enough for a cold index plus a few pages. */
const READ_TIMEOUT_MS = 10_000;

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: PiggiesErrorCode, status: number): Response {
  return Response.json({ error }, { status, headers: NO_STORE });
}

/** Ordered by number, unnumbered last, as the holder thinks of them. */
function byNumber(a: Piggy, b: Piggy): number {
  if (a.number !== null && b.number !== null) return a.number - b.number;
  if (a.number !== null) return -1;
  if (b.number !== null) return 1;
  return a.mint < b.mint ? -1 : a.mint > b.mint ? 1 : 0;
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/wallets/[address]/piggies">) {
  const { address } = await ctx.params;
  // Checked before anything reaches the index: garbage costs nothing.
  if (!isAddress(address)) return fail("invalid_address", 400);

  let read: WalletRead;
  try {
    read = await readWallet(address, SWAP_COLLECTION, AbortSignal.any([request.signal, AbortSignal.timeout(READ_TIMEOUT_MS)]));
  } catch (cause) {
    // Logged for the deployment's runtime logs; the holder gets one calm code.
    if (!request.signal.aborted) console.error("piggies: index read failed", address, cause);
    if (cause instanceof IndexerError && cause.code === "invalid_parameter") return fail("invalid_address", 400);
    return fail("indexer_unavailable", 502);
  }

  const piggies = read.piggies
    .map((piggy): Piggy => {
      const artId = artIdOf(piggy.mint);
      return { ...piggy, artId, verdict: verdicts(artId) };
    })
    .sort(byNumber);

  const body: WalletPiggies = {
    piggies,
    others: read.holdings
      .filter((holding) => holding.slug !== SWAP_COLLECTION)
      .map((holding) => ({ name: holding.name, count: holding.count, reason: otherReason(holding.slug) })),
    truncated: read.truncated,
  };
  return Response.json(body, { headers: NO_STORE });
}
