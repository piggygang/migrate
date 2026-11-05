import { PiggyMark } from "@/components/brand/wordmark";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnectButton } from "@/components/wallet/connect-button";

/** The hub's Migration glyph, from ../website/lib/apps.config.ts. */
const SWAP_ICON = "M15 4l6 4-6 4v-2H3V6h12Zm-6 8-6 4 6 4v-2h12v-4H9Z";

export default function Home() {
  return (
    <>
      <SiteHeader>
        <ConnectButton />
      </SiteHeader>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-12 text-center sm:pt-20">
          <PiggyMark className="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Swap your piggy to the new art
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted text-pretty sm:text-lg">
            Piggy Gang is Piggy SOL Gang, redrawn. This is where your piggy makes the move.
          </p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-16">
          <h2 className="mb-4 text-sm font-medium tracking-[0.14em] text-ink-muted uppercase">
            Migration
          </h2>
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line bg-surface/50 p-5">
            <div className="flex w-full items-center justify-between gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-[var(--accent)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-[22px] w-[22px]"
                  aria-hidden="true"
                >
                  <path d={SWAP_ICON} />
                </svg>
              </span>
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
                Coming soon
              </span>
            </div>
            <p className="max-w-md text-sm text-ink-muted text-pretty">
              Swaps are not open yet. The picker and the full rules land here first, with a preview
              of your piggy&apos;s new art before you sign anything.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
