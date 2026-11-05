# Piggy Migration

Swap your Piggy SOL Gang piggy to the new Piggy Gang art. Swaps are not open yet: this is the app shell, a working wallet connection, and the swap logic the picker and server route will build on.

Next.js App Router frontend on the skeleton the PiggyGang apps share, so it looks and behaves like DressMe, Raffles and Explorer. Wallets connect via Wallet Standard and sign in the browser; the app never holds a holder's key.

## Run

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

Checks (what CI runs):

```sh
pnpm lint
pnpm exec next typegen && pnpm exec tsc --noEmit
pnpm build
```

## Environment

Works with no environment at all — defaults target devnet.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `devnet` or `mainnet-beta`; anything else fails the build |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | public devnet endpoint | Browser RPC for blockhashes and confirmations; required on `mainnet-beta`, where a build without it fails. Rate-limit and domain-restrict it at the provider |
| `METADATA_BASE_URL` | `https://assets.piggygang.net/piggy-gang/json/` | Server-side base of the Piggy Gang metadata. Every swap writes a URI built from this on chain, so only change it for a devnet rehearsal |

Vercel: zero-config import. Previews stay on devnet; production sets `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta` and `NEXT_PUBLIC_SOLANA_RPC_URL`.

## Wallet smoke test

`/dev/wallet` (unlinked, noindex) connects a wallet and signs one Memo transaction on the configured cluster — the scaffold's acceptance check. Switch the wallet app itself to devnet first, and hold a little devnet SOL for the fee.
