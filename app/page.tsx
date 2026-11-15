import { PiggyMark } from "@/components/brand/wordmark";
import { Picker } from "@/components/picker/picker";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnectButton } from "@/components/wallet/connect-button";

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

        <section aria-labelledby="picker-heading" className="mx-auto w-full max-w-6xl px-5 pb-16">
          <h2
            id="picker-heading"
            className="mb-4 text-sm font-medium tracking-[0.14em] text-ink-muted uppercase"
          >
            Your Piggy SOL Gang
          </h2>
          <Picker />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
