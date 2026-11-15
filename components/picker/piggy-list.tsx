"use client";

import { roleOf, type Role, type Selection } from "@/lib/pairs";
import { labelOf, type Piggy } from "@/lib/piggies";
import { REASONS } from "@/lib/rules";
import { PiggyImage } from "./piggy-image";

const COPY: Record<Role, { title: string; hint: string }> = {
  upgrade: { title: "Upgrade", hint: "Becomes a Piggy Gang with its new art." },
  burn: { title: "Burn", hint: "Given up to make the swap." },
};

const OTHER: Record<Role, Role> = { upgrade: "burn", burn: "upgrade" };

// h-full: a card with a note must not stand taller than the rest of its row.
const CARD =
  "group flex h-full w-full flex-col rounded-xl border p-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

// Cards are a third of a ~330 px column from lg, else 3–5 across the page.
const SIZES = "(min-width: 1024px) 128px, (min-width: 768px) 18vw, (min-width: 640px) 23vw, 31vw";

/**
 * Every piggy in the wallet, as candidates for one role. Nothing is hidden: a
 * piggy that cannot play this role, by rule or because it already plays the
 * other, stays on the list and says why. Those cards are aria-disabled rather
 * than disabled, so keyboard and screen-reader users still reach the reason.
 */
export function PiggyList({
  role,
  piggies,
  selection,
  onPick,
}: {
  role: Role;
  piggies: readonly Piggy[];
  selection: Selection;
  onPick: (role: Role, mint: string) => void;
}) {
  const copy = COPY[role];

  return (
    <section aria-labelledby={`picker-${role}`} className="min-w-0">
      <h3 id={`picker-${role}`} className="text-base font-semibold tracking-tight">
        {copy.title}
      </h3>
      <p className="mt-0.5 text-sm text-ink-muted">{copy.hint}</p>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3">
        {piggies.map((piggy) => {
          const verdict = piggy.verdict[role];
          const held = roleOf(selection, piggy.mint);
          const swap = held ? selection[held].indexOf(piggy.mint) + 1 : 0;
          const picked = held === role;
          const elsewhere = held === OTHER[role];
          const unavailable = !verdict.ok || elsewhere;
          // Short enough for one line on the narrowest card.
          const note = !verdict.ok ? REASONS[verdict.reason].label : elsewhere ? `Swap ${swap} · ${OTHER[role]}` : null;

          return (
            <li key={piggy.mint}>
              <button
                type="button"
                aria-pressed={picked}
                aria-disabled={unavailable || undefined}
                onClick={() => {
                  if (!unavailable) onPick(role, piggy.mint);
                }}
                className={`${CARD} ${
                  picked
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : unavailable
                      ? "cursor-not-allowed border-line opacity-55"
                      : "border-line bg-surface hover:border-[var(--accent)]"
                }`}
              >
                <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-raised">
                  <PiggyImage src={piggy.image} alt="" sizes={SIZES} />
                  {picked && (
                    <span className="absolute top-1 left-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] leading-none font-semibold text-canvas">
                      Swap {swap}
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate px-0.5 font-mono text-xs">{labelOf(piggy)}</span>
                {note && <span className="block px-0.5 text-[11px] leading-snug text-ink-muted">{note}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
