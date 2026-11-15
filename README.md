# Piggy Migration

Swap your Piggy SOL Gang piggy to the new Piggy Gang art. Swaps are not open yet: the picker lists a wallet's Piggy SOL Gang from the PiggyGang Indexer and previews the new art each pair makes, and the server route that builds and co-signs a swap comes next. Its eligibility rules live in `lib/rules.ts` and are provisional until PIG-183 records the decided rules here.

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
| `INDEXER_URL` | `https://api.indexer.piggygang.net` | Server-side PiggyGang Indexer the picker reads holdings from. It indexes mainnet only, so a devnet build shows holders their mainnet piggies; a devnet swap rehearsal must point this at a devnet index |
| `NEXT_PUBLIC_ART_BASE_URL` | `https://assets.piggygang.net/piggy-gang/images/` | Where the picker previews new art (`{base}{art id}.png`). Display only. Must be https; the image optimizer allows exactly this prefix. Answers 404 until the art is uploaded, and previews show the piggy mark until then |

Vercel: zero-config import. Previews stay on devnet; production sets `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta` and `NEXT_PUBLIC_SOLANA_RPC_URL`.

## Wallet smoke test

`/dev/wallet` (unlinked, noindex) connects a wallet and signs one Memo transaction on the configured cluster — the scaffold's acceptance check. Switch the wallet app itself to that cluster first, and hold a little SOL there for the fee. On `mainnet-beta` that fee is real SOL.

## Picker test

`/dev/picker?address=<wallet>` (unlinked, noindex) renders the picker for any address, read from the live index, with nothing connected and nothing to sign. Use it to check a wallet nobody on the team holds, such as one with 50 Piggy SOL Gang for the load time, or one holding a piggy that has no new art.
