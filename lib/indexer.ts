import "server-only";
import { isAddress } from "@/lib/base58";

/**
 * The PiggyGang Indexer, read on the server by the piggies route — the only
 * caller. Plain fetch, no SDK, and it speaks this app's vocabulary (mint,
 * number, image), never the API's DTOs, so nothing downstream learns the wire
 * shape.
 *
 * **Trusted for WHICH piggies a wallet holds, never for what they are or may
 * do.** Art and eligibility come from the committed mint map and lib/rules.ts,
 * and the swap route (PIG-194) proves ownership on chain. A wrong answer here
 * can change what a holder is offered, never what is signed.
 *
 * **Mainnet only.** The index has no devnet environment yet (PIG-116), so a
 * devnet build reads a holder's mainnet piggies: right for previewing the
 * picker, wrong for a devnet swap rehearsal, which must point INDEXER_URL at a
 * devnet index first.
 */

/**
 * `||` so an empty assignment means unset. http is allowed for the local API
 * and the contract's Prism mock (localhost:8080 and :4010). A value that is
 * set but not a URL fails the build, as NEXT_PUBLIC_SOLANA_CLUSTER does.
 */
function parseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`INDEXER_URL must be an http(s) URL, got "${raw}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`INDEXER_URL must be an http(s) URL, got "${raw}"`);
  }
  return url.href.replace(/\/+$/, "");
}

export const INDEXER_URL = parseUrl(process.env.INDEXER_URL?.trim() || "https://api.indexer.piggygang.net");

export type IndexedPiggy = {
  mint: string;
  number: number | null;
  name: string;
  /** Today's art. Null when the index has none, or has found its host dead. */
  image: string | null;
};

export type Holding = { slug: string; name: string; count: number };

export type WalletRead = {
  /** The wallet's piggies in the collection asked for, deduplicated, unordered. */
  piggies: IndexedPiggy[];
  /** Every collection the wallet holds, from the unpaginated summary. */
  holdings: Holding[];
  /** The page cap was hit, so `piggies` may be missing some. */
  truncated: boolean;
};

export class IndexerError extends Error {
  /** The API's own error code, which is stabler than the HTTP status. */
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "IndexerError";
    this.code = code;
  }
}

/** The API's maximum; 101 is a 422 rather than a silent clamp. */
const PAGE = 100;

/**
 * 2,000 piggies. The largest Piggy SOL Gang holder in the index is a
 * marketplace escrow with 249, so this bounds a runaway cursor chain without
 * trimming any real wallet.
 */
const MAX_PAGES = 20;

async function get(path: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    // no-store: the API answers max-age=15, and a piggy that was just sold or
    // swapped must not linger in a server-side cache.
    response = await fetch(`${INDEXER_URL}${path}`, {
      signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch (cause) {
    if (signal.aborted) throw cause;
    throw new IndexerError("The index could not be reached.");
  }

  // The error body is JSON by contract, but a proxy in front of a cold
  // service answers with HTML.
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    if (response.ok) throw new IndexerError("The index sent a malformed reply.");
  }

  if (!response.ok) {
    // Switch on the code, not the status: the same mistake is 400 on one
    // route and 422 on another.
    const code = typeof body.error === "string" ? body.error : null;
    throw new IndexerError(`The index answered ${response.status}${code ? ` (${code})` : ""}.`, code);
  }
  return body;
}

/**
 * One portfolio row, or null when it is not a live piggy of `collection` held
 * by `owner`. The filter and the contract promise all of that already; this
 * holds the line if either ever slips, so nothing that is not the holder's
 * piggy reaches the picker.
 */
function parseRow(value: unknown, owner: string, collection: string): IndexedPiggy | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const slug = (row.collection as { slug?: unknown } | null | undefined)?.slug;
  if (slug !== collection || row.burned !== false || row.owner !== owner) return null;
  if (typeof row.address !== "string" || !isAddress(row.address)) return null;
  return {
    mint: row.address,
    number: Number.isSafeInteger(row.number) ? (row.number as number) : null,
    name: typeof row.name === "string" ? row.name : "",
    image: typeof row.imageUri === "string" && row.imageStatus !== "dead" ? row.imageUri : null,
  };
}

function parseHoldings(value: unknown): Holding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    const { collection, count } = (entry ?? {}) as { collection?: { slug?: unknown; name?: unknown }; count?: unknown };
    if (typeof collection?.slug !== "string" || typeof collection.name !== "string") return [];
    if (!Number.isSafeInteger(count) || (count as number) < 1) return [];
    return [{ slug: collection.slug, name: collection.name, count: count as number }];
  });
}

/**
 * A wallet's piggies in one collection, walking the cursor chain of
 * `/v1/wallets/{address}/nfts?collection=…`. Burned piggies never appear (a
 * burned asset has no owner), and neither do listed or staked ones, which an
 * escrow holds rather than the wallet.
 */
export async function readWallet(address: string, collection: string, signal: AbortSignal): Promise<WalletRead> {
  const piggies: IndexedPiggy[] = [];
  const seen = new Set<string>();
  let holdings: Holding[] = [];
  let cursor: string | null = null;
  let pages = 0;
  let truncated = false;

  do {
    const params = new URLSearchParams({ collection, limit: String(PAGE) });
    if (cursor) params.set("cursor", cursor);
    const body = await get(`/v1/wallets/${encodeURIComponent(address)}/nfts?${params}`, signal);

    // Unpaginated and repeated on every page, and unaffected by the filter.
    if (pages === 0) holdings = parseHoldings(body.collections);

    const page = (body.nfts ?? {}) as { data?: unknown; nextCursor?: unknown; hasMore?: unknown };
    // A 200 without its rows is a broken reply, not an empty wallet: reading it
    // as "no piggies" would replace the list a holder is looking at.
    if (!Array.isArray(page.data)) throw new IndexerError("The index sent a malformed reply.");
    for (const row of page.data) {
      const piggy = parseRow(row, address, collection);
      // A live update can move a row across a page boundary.
      if (!piggy || seen.has(piggy.mint)) continue;
      seen.add(piggy.mint);
      piggies.push(piggy);
    }

    cursor = typeof page.nextCursor === "string" ? page.nextCursor : null;
    pages += 1;
    // `hasMore` with no cursor is a dead end, not a completed walk.
    if ((pages >= MAX_PAGES && cursor) || (page.hasMore === true && !cursor)) {
      truncated = true;
      break;
    }
  } while (cursor);

  return { piggies, holdings, truncated };
}
