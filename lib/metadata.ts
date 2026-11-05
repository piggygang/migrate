import "server-only";
import { artIdOf } from "@/lib/mint-map";

/**
 * Where the new art's JSON lives. Every URI built from this is written on
 * chain, so the default is our own domain even while files are still moving
 * there: vendor hostnames have died on this project twice, and an unset
 * variable must never mint a URI on one. METADATA_BASE_URL exists so a devnet
 * rehearsal can point somewhere else. Read with `||` so an empty assignment
 * means unset, as it does for every other variable here.
 */
const METADATA_BASE = (process.env.METADATA_BASE_URL || "https://assets.piggygang.net/piggy-gang/json/").replace(
  /\/*$/,
  "/",
);

export type PiggyGangMetadata = {
  name: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
};

/** What a Piggy SOL Gang mint becomes: the on-chain URI and the document behind it. */
export type SwapTarget = { uri: string; metadata: PiggyGangMetadata };

/**
 * Resolves a mint to its new art, or null when the mint has none. A mapped
 * mint whose document is missing or malformed throws instead: that is our
 * outage rather than an ineligible piggy, and the name read here goes on chain.
 */
export async function swapTargetOf(mint: string, signal?: AbortSignal): Promise<SwapTarget | null> {
  const artId = artIdOf(mint);
  if (!artId) return null;

  const uri = `${METADATA_BASE}${artId}.json`;
  const response = await fetch(uri, { signal });
  if (!response.ok) throw new Error(`Metadata ${artId} returned ${response.status}.`);

  const { name, image, attributes } = (await response.json()) as Partial<PiggyGangMetadata>;
  if (!name || typeof name !== "string" || typeof image !== "string" || !Array.isArray(attributes)) {
    throw new Error(`Metadata ${artId} is malformed.`);
  }
  return { uri, metadata: { name, image, attributes } };
}
