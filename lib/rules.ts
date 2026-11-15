import type { Role } from "@/lib/pairs";

/**
 * The migration rules the picker applies, and the words it explains them in,
 * kept together so a rule change is one edit. Shared: the piggies route
 * decides with them and the picker renders their wording.
 *
 * PROVISIONAL until PIG-183 decides the rules. Each one below is either the old
 * app's behaviour or what this story and the server route (PIG-194) already
 * assume, and is marked where PIG-183 may change it. The ratio, two Piggy SOL
 * Gang for one Piggy Gang, is the pair model of lib/pairs.ts itself. The picker
 * only offers; the server route must enforce the same rules against the chain,
 * because an index can lag and a client can send anything.
 */

/**
 * The indexer slug of the collection a swap takes, in both roles. PIG-183:
 * the burned piggy could also be allowed to be a Piggy Girl Gang. The old app
 * accepted any NFT there, which is the hole PIG-194 closes.
 */
export const SWAP_COLLECTION = "piggy-sol-gang";

export type Reason = "no_art";
export type Verdict = { ok: true } | { ok: false; reason: Reason };

const OK: Verdict = { ok: true };

/**
 * Whether a held Piggy SOL Gang may play each role. The upgraded piggy needs
 * new art, which exists exactly for the mints in the mint map. Today that
 * leaves out 15 live piggies; the other 64 unmapped mints are already burned.
 * The burned piggy needs no art, so any live one can be it. PIG-183 decides
 * whether the unmapped ones get art or stay out of the upgrade role.
 */
export function verdicts(artId: string | null): Record<Role, Verdict> {
  return {
    upgrade: artId ? OK : { ok: false, reason: "no_art" },
    burn: OK,
  };
}

/** "a", "a and b", "a, b and c". */
export function listOf(items: readonly string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A card's short label, and the sentence that explains it for the piggies named. */
export const REASONS: Record<Reason, { label: string; explain: (piggies: readonly string[]) => string }> = {
  no_art: {
    label: "No new art yet",
    explain: (piggies) =>
      piggies.length === 1
        ? `${piggies[0]} has no Piggy Gang art yet, so it can't be upgraded. It can still be the piggy you burn.`
        : `${listOf(piggies)} have no Piggy Gang art yet, so they can't be upgraded. Any of them can still be the piggy you burn.`,
  },
};

export type OtherReason = "already_new_art" | "not_swappable";

/** Why a collection other than SWAP_COLLECTION sits out of the picker. */
export function otherReason(slug: string): OtherReason {
  return slug === "piggy-gang" ? "already_new_art" : "not_swappable";
}

/** One sentence per reason, over holdings already counted ("4 Pig Mud"). */
export const OTHER_REASONS: Record<OtherReason, (holdings: readonly string[], plural: boolean) => string> = {
  already_new_art: (holdings, plural) =>
    `${listOf(holdings)} in this wallet ${plural ? "already have" : "already has"} the new art.`,
  not_swappable: (holdings, plural) =>
    `${listOf(holdings)} in this wallet ${plural ? "aren't" : "isn't"} part of a swap: only Piggy SOL Gang are.`,
};

/**
 * The most swaps these piggies allow. A swap is one piggy that may be upgraded
 * plus another that may be burned, and no piggy plays twice — so the count is
 * bounded by each role and by half the pool, whatever the verdicts become.
 */
export function maxSwaps(piggies: readonly { verdict: Record<Role, Verdict> }[]): number {
  let upgradeOnly = 0;
  let burnOnly = 0;
  let either = 0;
  for (const { verdict } of piggies) {
    if (verdict.upgrade.ok && verdict.burn.ok) either += 1;
    else if (verdict.upgrade.ok) upgradeOnly += 1;
    else if (verdict.burn.ok) burnOnly += 1;
  }
  return Math.min(upgradeOnly + either, burnOnly + either, Math.floor((upgradeOnly + burnOnly + either) / 2));
}
