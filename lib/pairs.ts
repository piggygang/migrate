/**
 * Which piggy does what in a swap, as pure data over mint addresses: the
 * picker renders it, and nothing here knows about wallets or the chain.
 *
 * "upgrade" is the piggy whose new art the holder receives; "burn" is the one
 * given up alongside it. Both are burned on chain.
 */
export type Role = "upgrade" | "burn";
export type Selection = Readonly<Record<Role, readonly string[]>>;
export type Pair = Readonly<Record<Role, string>>;

export const NO_SELECTION: Selection = { upgrade: [], burn: [] };

/** The role a mint holds in this selection, or null if it has not been picked. */
export function roleOf(selection: Selection, mint: string): Role | null {
  if (selection.upgrade.includes(mint)) return "upgrade";
  if (selection.burn.includes(mint)) return "burn";
  return null;
}

/**
 * Picks a mint for a role, or drops it if it already holds that role. A piggy
 * cannot play both parts, so a mint holding the other role is left alone —
 * the picker disables it too, but this stays true whatever calls it.
 */
export function toggle(selection: Selection, role: Role, mint: string): Selection {
  const current = roleOf(selection, mint);
  if (current && current !== role) return selection;
  return {
    ...selection,
    [role]: current ? selection[role].filter((other) => other !== mint) : [...selection[role], mint],
  };
}

/**
 * The swaps a selection describes: the nth upgrade with the nth burn, in the
 * order they were picked. Null until the two lists are non-empty and the same
 * length, because a leftover piggy has nothing to pair with.
 */
export function toPairs({ upgrade, burn }: Selection): Pair[] | null {
  if (upgrade.length === 0 || upgrade.length !== burn.length) return null;
  return upgrade.map((mint, index) => ({ upgrade: mint, burn: burn[index] }));
}

/** A pair position as the builder shows it: either side may still be empty. */
export type Slot = Readonly<Record<Role, string | null>>;

/**
 * Every pair position the selection describes, complete or not, so the pair
 * builder can show a pick still waiting for its partner. Which burned piggy
 * meets which upgrade changes nothing about the outcome, which is why plain
 * pick order is enough. toPairs() is what a swap takes.
 */
export function slots({ upgrade, burn }: Selection): Slot[] {
  return Array.from({ length: Math.max(upgrade.length, burn.length) }, (_, index) => ({
    upgrade: upgrade[index] ?? null,
    burn: burn[index] ?? null,
  }));
}

/** Drops both picks at one position. Later positions move up. */
export function removeSlot(selection: Selection, index: number): Selection {
  return {
    upgrade: selection.upgrade.filter((_, at) => at !== index),
    burn: selection.burn.filter((_, at) => at !== index),
  };
}

/**
 * Keeps only the picks a fresh read still allows, so a piggy sold or swapped
 * since it was picked drops out instead of lingering in a pair.
 */
export function retain(selection: Selection, allowed: (role: Role, mint: string) => boolean): Selection {
  return {
    upgrade: selection.upgrade.filter((mint) => allowed("upgrade", mint)),
    burn: selection.burn.filter((mint) => allowed("burn", mint)),
  };
}
