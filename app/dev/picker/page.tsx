import type { Metadata } from "next";
import { WalletPicker } from "@/components/picker/picker";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnectButton } from "@/components/wallet/connect-button";
import { isAddress } from "@/lib/base58";

/** A hand-testing harness, not a destination — kept out of every index. */
export const metadata: Metadata = {
  title: "Picker test",
  robots: { index: false, follow: false },
};

const INPUT =
  "min-w-0 flex-1 rounded-full border border-line bg-surface-raised px-3.5 py-2 font-mono text-sm placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const ACTION =
  "shrink-0 rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/**
 * The picker for any address, no wallet needed: how to check a wallet nobody
 * on the team holds (the 50-piggy load time, a piggy with no new art) against
 * the live index. Read-only by construction — the address is typed, not
 * connected, so nothing here can sign for it.
 */
export default async function Page({ searchParams }: PageProps<"/dev/picker">) {
  const { address } = await searchParams;
  const wallet = typeof address === "string" && isAddress(address) ? address : null;

  return (
    <>
      <SiteHeader>
        <ConnectButton />
      </SiteHeader>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 sm:pt-20">
          <p className="text-sm font-medium tracking-[0.14em] text-ink-muted uppercase">Picker test</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Any wallet&apos;s piggies
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-muted text-pretty">
            Reads an address&apos;s Piggy SOL Gang the way the picker does, from the live index,
            with nothing connected and nothing to sign.
          </p>

          {/* A plain GET form: the address lands in the URL, so a reading can be shared. */}
          <form method="get" className="mt-8 flex max-w-xl gap-2">
            <label htmlFor="dev-address" className="sr-only">
              Wallet address
            </label>
            <input
              id="dev-address"
              name="address"
              defaultValue={typeof address === "string" ? address : ""}
              placeholder="Wallet address"
              autoComplete="off"
              spellCheck={false}
              className={INPUT}
            />
            <button type="submit" className={ACTION}>
              Read
            </button>
          </form>
          {typeof address === "string" && address !== "" && !wallet && (
            <p role="alert" className="mt-3 text-xs text-brand">
              That isn&apos;t a Solana wallet address.
            </p>
          )}

          {wallet && (
            <div className="mt-10">
              <WalletPicker key={wallet} address={wallet} />
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
