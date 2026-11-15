"use client";

import { artUrl } from "@/lib/art";
import { slots, toPairs, type Role, type Selection } from "@/lib/pairs";
import { labelOf, type Piggy } from "@/lib/piggies";
import { PiggyImage } from "./piggy-image";

const ROLE_WORD: Record<Role, string> = { upgrade: "upgrade", burn: "burn" };

/**
 * The swaps the two lists describe, each previewing what it makes: both
 * piggies as they are today, and the upgraded one's new art. A pick still
 * waiting for its partner shows as an open slot, so the holder can see what
 * is missing. Swaps are separate transactions, which is why each pair stands
 * alone here.
 */
export function PairBuilder({
  selection,
  byMint,
  onRemove,
}: {
  selection: Selection;
  byMint: ReadonlyMap<string, Piggy>;
  onRemove: (index: number) => void;
}) {
  const rows = slots(selection);
  const ready = toPairs(selection)?.length ?? 0;

  return (
    <section
      aria-labelledby="picker-swaps"
      className="min-w-0 self-start rounded-card border border-line bg-surface p-4 lg:sticky lg:top-20"
    >
      <h3 id="picker-swaps" className="text-base font-semibold tracking-tight">
        Your swaps
      </h3>

      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted text-pretty">
          Pick a piggy to upgrade and one to burn. Each pair becomes one Piggy Gang.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {rows.map((slot, index) => {
            const upgrade = slot.upgrade ? byMint.get(slot.upgrade) : undefined;
            const burn = slot.burn ? byMint.get(slot.burn) : undefined;
            return (
              // Positional by design: pairs zip by pick order, so a row is its index.
              <li key={index} className="rounded-xl border border-line bg-surface-raised/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-ink-muted">Swap {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    aria-label={`Remove swap ${index + 1}`}
                    className="rounded-full px-1.5 text-xs text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <Source piggy={upgrade} role="upgrade" />
                  <span aria-hidden="true" className="text-sm text-ink-muted">
                    +
                  </span>
                  <Source piggy={burn} role="burn" />
                  <span aria-hidden="true" className="text-sm text-ink-muted">
                    →
                  </span>
                  <Result piggy={upgrade} />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Not wired yet: the server route (PIG-194) builds and co-signs each
          swap and the client flow (PIG-203) sends it. Until then the button
          says so rather than pretending. */}
      <button
        type="button"
        disabled
        className="mt-4 w-full rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {ready > 0 ? `Swap ${ready} ${ready === 1 ? "pair" : "pairs"}` : "Swap"}
      </button>
      <p className="mt-2 text-xs text-ink-muted text-pretty">
        Swaps aren&apos;t open yet, so nothing here asks your wallet to sign.
      </p>
    </section>
  );
}

/** One of the two Piggy SOL Gang going in, or the open slot waiting for it. */
function Source({ piggy, role }: { piggy: Piggy | undefined; role: Role }) {
  return (
    <span className="flex w-12 shrink-0 flex-col items-center gap-1">
      <span
        className={`relative block size-12 overflow-hidden rounded-lg ${
          piggy ? "bg-surface-raised" : "border border-dashed border-line"
        }`}
      >
        {piggy && <PiggyImage src={piggy.image} alt="" sizes="48px" />}
      </span>
      <span className="w-full truncate text-center text-[10px] leading-none text-ink-muted">
        {piggy ? (
          <>
            <span className="sr-only">{ROLE_WORD[role]} </span>
            <span className="font-mono text-ink">{labelOf(piggy)}</span>
          </>
        ) : (
          `pick to ${ROLE_WORD[role]}`
        )}
      </span>
    </span>
  );
}

/** The Piggy Gang a swap makes: the upgraded piggy's new art, under its number. */
function Result({ piggy }: { piggy: Piggy | undefined }) {
  const name = piggy ? `Piggy Gang ${labelOf(piggy)}` : null;
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span
        className={`relative block aspect-square w-full max-w-24 overflow-hidden rounded-xl ${
          piggy ? "bg-surface-raised ring-1 ring-[var(--accent)]/60" : "border border-dashed border-line"
        }`}
      >
        {piggy && (
          <PiggyImage src={piggy.artId ? artUrl(piggy.artId) : null} alt={`${name}, new art`} sizes="96px" />
        )}
      </span>
      <span className="w-full truncate text-center text-[10px] leading-none text-ink-muted">
        {name ? <span className="text-[var(--accent)]">{name}</span> : "new art"}
      </span>
    </span>
  );
}
