/**
 * Where piggy images live, and which of them next/image may optimize.
 *
 * Imported by next.config.ts as well as by the picker, so it imports nothing:
 * images.remotePatterns is built from OPTIMIZED_PREFIXES below, and the
 * picker's optimizable() reads the same list, so the two cannot drift. A src
 * outside remotePatterns is a hard 400 from the optimizer rather than a
 * graceful miss, which is why the picker checks first.
 */

/**
 * Display only — unlike METADATA_BASE_URL, nothing built from this goes on
 * chain — but the default is still our own domain, never a vendor host. Until
 * PIG-198 uploads the art it answers 404 and previews fall back to the piggy
 * mark, so a preview deployment that wants real art points
 * NEXT_PUBLIC_ART_BASE_URL at a copy. Read with `||` because Next inlines an
 * empty NEXT_PUBLIC_ assignment as "", which `??` would keep.
 */
const DEFAULT_ART_BASE = "https://assets.piggygang.net/piggy-gang/images/";

/** An https URL without query or fragment, ending in exactly one slash. A bad value breaks the build. */
function parseBase(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_ART_BASE_URL must be an https URL, got "${raw}"`);
  }
  if (url.protocol !== "https:" || url.search || url.hash) {
    throw new Error(`NEXT_PUBLIC_ART_BASE_URL must be an https URL with no query or fragment, got "${raw}"`);
  }
  return url.href.replace(/\/*$/, "/");
}

export const ART_BASE = parseBase(process.env.NEXT_PUBLIC_ART_BASE_URL?.trim() || DEFAULT_ART_BASE);

/** The new art of a Piggy Gang art id, as the mint map names it. */
export const artUrl = (artId: string) => `${ART_BASE}${artId}.png`;

/**
 * Exact prefixes, never wildcard hosts: `**.r2.dev` would let anyone route an
 * arbitrary bucket through this app's optimizer. Our own domain covers the new
 * art and, once PSG moves there, the old; the r2.dev path is where the indexer
 * re-hosts Piggy SOL Gang images today. The new art reaches 2,800 px and 3.6 MB
 * per PNG, which is why these go through the optimizer at all.
 */
export const OPTIMIZED_PREFIXES: readonly string[] = [
  ...new Set([
    ART_BASE,
    "https://assets.piggygang.net/",
    "https://pub-b1a45763f0a64d8fa271f66f5514a561.r2.dev/old/images/",
  ]),
];

/**
 * Whether next/image will accept this src. remotePatterns built from a URL
 * also refuse any query string, so this does too. The `ipfs://` and `ar://`
 * links 2021 metadata still carries simply match no prefix.
 */
export function optimizable(src: string): boolean {
  try {
    const url = new URL(src);
    return !url.search && OPTIMIZED_PREFIXES.some((prefix) => url.href.startsWith(prefix));
  } catch {
    // A bare path or anything malformed: not an error, just nothing the
    // optimizer can fetch.
    return false;
  }
}
