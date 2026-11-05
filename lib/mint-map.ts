import "server-only";
import data from "./mint-map.json";

/**
 * Piggy SOL Gang mint → Piggy Gang art id, for the 9,921 mints that have art.
 * The art id names the new asset's files, so this table decides what every
 * swapped piggy becomes.
 *
 * A Map rather than the JSON object itself: mints arrive from clients, and a
 * plain object answers "constructor" or "__proto__" with something truthy.
 * Server-only because the table is 700 KB and no client needs all of it.
 */
const MINT_MAP: ReadonlyMap<string, string> = new Map(Object.entries(data));

/** The art id a mint swaps into, or null when it has none. */
export const artIdOf = (mint: string): string | null => MINT_MAP.get(mint) ?? null;
