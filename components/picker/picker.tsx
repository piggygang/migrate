"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { NO_SELECTION, removeSlot, retain, toggle, type Role, type Selection } from "@/lib/pairs";
import { labelOf, type WalletPiggies } from "@/lib/piggies";
import { OTHER_REASONS, REASONS, maxSwaps, type OtherReason, type Reason } from "@/lib/rules";
import { PairBuilder } from "./pair-builder";
import { PiggyList } from "./piggy-list";
import { usePiggies } from "./use-piggies";

const QUIET_BUTTON =
  "shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";

/** The home page's picker: the connected wallet's, or a way to connect one. */
export function Picker() {
  const { address, openModal } = useWallet();

  if (!address) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-line bg-surface/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-ink-muted text-pretty">
          Connect a wallet to see your Piggy SOL Gang and preview the Piggy Gang each one becomes.
        </p>
        <button type="button" onClick={openModal} className={QUIET_BUTTON}>
          Connect wallet
        </button>
      </div>
    );
  }

  // Keyed, so switching accounts in the wallet starts the read and the
  // picks over rather than carrying another wallet's pairs across.
  return <WalletPicker key={address} address={address} />;
}

/**
 * The picker for one wallet. Exported for the /dev/picker harness, which
 * renders it for any address: whatever wires up signing (PIG-203) must sign
 * only for the connected account, never for the `address` shown here.
 */
export function WalletPicker({ address }: { address: string }) {
  const { data, error, reading, refresh } = usePiggies(address);
  const [picked, setPicked] = useState<Selection>(NO_SELECTION);

  const byMint = useMemo(() => new Map((data?.piggies ?? []).map((piggy) => [piggy.mint, piggy])), [data]);
  // Picks a fresh read no longer allows (sold, swapped, re-ruled) fall out
  // here, during render, rather than in an effect.
  const selection = useMemo(
    () => retain(picked, (role, mint) => byMint.get(mint)?.verdict[role].ok === true),
    [picked, byMint],
  );

  const pick = (role: Role, mint: string) => setPicked(toggle(selection, role, mint));
  const remove = (index: number) => setPicked(removeSlot(selection, index));

  if (!data) {
    return error ? (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-brand">{error}</p>
        <button type="button" onClick={refresh} className={QUIET_BUTTON}>
          Try again
        </button>
      </div>
    ) : (
      <Reading />
    );
  }

  const count = data.piggies.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pretty">{summaryOf(count, maxSwaps(data.piggies))}</p>
        <button type="button" onClick={refresh} disabled={reading} className={QUIET_BUTTON}>
          {reading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* A refresh that failed over a list still on screen. */}
      {error && (
        <p role="alert" className="mt-3 text-sm text-brand">
          {error}
        </p>
      )}

      {count > 0 && (
        <>
          <p className="mt-3 max-w-2xl text-sm text-ink-muted text-pretty">
            Each swap takes two Piggy SOL Gang: the one you upgrade becomes a Piggy Gang with its new
            art, and both originals are burned. A burn can&apos;t be undone.
          </p>
          {/* The lists first, so keyboard and screen-reader order runs pick →
              review; from lg the builder takes a sticky third column. */}
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem] lg:gap-6">
            <PiggyList role="upgrade" piggies={data.piggies} selection={selection} onPick={pick} />
            <PiggyList role="burn" piggies={data.piggies} selection={selection} onPick={pick} />
            <PairBuilder selection={selection} byMint={byMint} onRemove={remove} />
          </div>
        </>
      )}

      <Notes data={data} />
    </div>
  );
}

function summaryOf(count: number, swaps: number): string {
  if (count === 0) return "No Piggy SOL Gang in this wallet.";
  if (count === 1) return "One Piggy SOL Gang in this wallet. A swap takes two: one to upgrade, one to burn.";
  // The reason is in the notes below, whichever rule it is.
  if (swaps === 0) return `${count} Piggy SOL Gang in this wallet, but they can't make a swap yet.`;
  return `${count} Piggy SOL Gang in this wallet: enough for up to ${swaps} ${swaps === 1 ? "swap" : "swaps"}.`;
}

/**
 * Every piggy that cannot be swapped, and why, so nothing is silently missing:
 * the ones on the lists that cannot play a role, the other collections in the
 * wallet, and the piggies that are not in the wallet at all right now.
 */
function Notes({ data }: { data: WalletPiggies }) {
  // Both roles, whatever PIG-183 decides: each reason once, each piggy once per reason.
  const blocked = new Map<Reason, string[]>();
  for (const piggy of data.piggies) {
    for (const verdict of Object.values(piggy.verdict)) {
      if (verdict.ok) continue;
      const names = blocked.get(verdict.reason) ?? [];
      if (!names.includes(labelOf(piggy))) blocked.set(verdict.reason, [...names, labelOf(piggy)]);
    }
  }

  const others = new Map<OtherReason, { names: string[]; total: number }>();
  for (const holding of data.others) {
    const group = others.get(holding.reason) ?? { names: [], total: 0 };
    group.names.push(`${holding.count} ${holding.name}`);
    group.total += holding.count;
    others.set(holding.reason, group);
  }

  return (
    <ul className="mt-8 flex max-w-2xl flex-col gap-2 border-t border-line pt-4 text-sm text-ink-muted text-pretty">
      {[...blocked].map(([reason, names]) => (
        <li key={reason}>{REASONS[reason].explain(names)}</li>
      ))}
      {[...others].map(([reason, { names, total }]) => (
        <li key={reason}>{OTHER_REASONS[reason](names, total > 1)}</li>
      ))}
      {data.truncated && (
        <li>This wallet holds more piggies than one read covers, so only the first {data.piggies.length} show here.</li>
      )}
      <li>
        Piggies listed for sale or staked are held by the marketplace or staking program rather than your
        wallet, so they don&apos;t show here. Just moved one? The index can take a minute to catch up.
      </li>
    </ul>
  );
}

/** A grid-shaped placeholder while the first read is out. */
function Reading() {
  return (
    <div role="status">
      <p className="text-sm text-ink-muted">Reading your piggies…</p>
      <div aria-hidden="true" className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-square animate-pulse rounded-xl bg-surface-raised motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
