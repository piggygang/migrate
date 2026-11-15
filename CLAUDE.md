# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Git rules

- **Never commit, push, tag, open PRs or deploy.** That means no `git commit`, `git push`, `git tag`, `gh pr create` or `vercel`, not even when asked to "finish up". Creating a branch is fine: use the Linear issue's suggested name (`feature/pig-NNN-<slug>`). When the work is done, run the gate CI runs (`pnpm lint`, the typecheck and `pnpm build`, below) for any code change, then output a suggested commit message plus the exact paths to stage. Never suggest `git add -A` or `git add .`.
- **Suggested commit messages** are a single line in Conventional Commits form: lowercase imperative subject, optional scope, no trailing period, no body. Types are `feat`, `fix`, `docs`, `refactor`, `style`, `perf`, `chore`, `build` and `ci`. Scopes are app areas: `wallet`, `tx`, `rpc`, `chrome` (header/footer), `brand`, `home`, `swap`, `pairs`, `metadata`, `deps`. Example: `feat(swap): validate the pair against the chain`. Never append ` (#N)`.
- **No AI attribution anywhere.** Never write `Co-Authored-By: Claude …`, "🤖 Generated with Claude Code" or anything similar, whether in commit messages, PR text, code comments, page copy or metadata.

## Commands

Use pnpm (version pinned via `packageManager` in package.json; Node 24 via `.tool-versions`).

- `pnpm dev` — dev server at http://localhost:3000
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint (flat config in `eslint.config.mjs`)
- `pnpm exec next typegen && pnpm exec tsc --noEmit` — typecheck (no package script exists for this; `next typegen` generates `next-env.d.ts` and route types first)

No test framework is configured.

## Architecture

Next.js 16.4.5 App Router project with TypeScript strict mode and React 19, cloned from raffles' skeleton so the org's apps share one look. It runs ahead of the siblings' 16.3.0 on purpose: 16.3.x carries unauthenticated RCE advisories that only 16.4.1 fixes, and this app's server will hold a signing key, so keep `pnpm audit --prod` clean. This is a refactor of the old `piggy-upgrades` app, which is a reference for logic only: nothing is copied from it but the mint map, and it shares no history with this repo.

- Routes live in `app/` at the repo root (no `src/`). `app/layout.tsx` loads Geist fonts via `next/font/google`; theme tokens live in `app/globals.css` (Tailwind v4 `@theme inline` — there is no tailwind.config). Path alias `@/*` maps to the repo root.
- Layouts/pages use Next 16's generated route-typed props (`LayoutProps<"/">`) as ambient globals; `pnpm exec next typegen` generates them without a full build.
- Chrome (header/footer) is rendered by each page, not the root layout — `<body>` is a flex column whose children must stay the header, `main.flex-1` and footer. Pages pass `<ConnectButton />` into the header's children slot.
- `--accent` (`#ff8ec4`, the hub's Migration card) sits on `:root`, because the whole app is one card; dressme and the hub set it inline per card. Consumers use the same `text-[var(--accent)]` idiom. `--brand` is unchanged: the piggy mark and the shared chrome's hover and focus states match every other app, and the accent is for this app's identity and its own content.
- Cluster is build-time config in `lib/cluster.ts`: `NEXT_PUBLIC_SOLANA_CLUSTER` unset → devnet (the only safe default), invalid → build error. The Wallet Standard chain string is `solana:mainnet`, never `solana:mainnet-beta`.
- `pnpm-workspace.yaml` exists only for pnpm settings; sharp is **enabled** (unlike dressme), and `images.remotePatterns` is built from `lib/art.ts` (see Picker). pnpm 11 stops on any build script not listed under `allowBuilds`, so a new dependency that has one needs an explicit entry.

## Wallet & signing

Like raffles and unlike dressme, connecting here is **not** read-only — this app signs and sends transactions.

- `lib/wallet.ts` is Wallet Standard discovery **and signing** via `@wallet-standard/app`, deliberately not `@solana/wallet-adapter-*` and not web3.js (no Buffer polyfill in the bundle). Types are structural. `connect()` returns full `WalletAccount` objects because `solana:signAndSendTransaction` needs the account (with its `publicKey` bytes) handed back — never reduce it to addresses again.
- The wallet filter requires the configured chain plus the sign-and-send feature: a wallet that cannot sign would connect and then dead-end at every action.
- `lib/tx.ts` hand-serializes the one transaction the browser builds (legacy tx, Memo program, zero-filled signature placeholder — the canonical unsigned wire form every major wallet accepts). The Memo id is the one in `@solana/spl-memo`; the often-quoted `MemoSq4g…` has no account on devnet or mainnet and fails simulation with `ProgramAccountNotFound`.
- `lib/solana-rpc.ts` is the browser's entire chain surface: `getLatestBlockhash` before signing, `confirmTransaction` (a 2 s `getSignatureStatuses` poll, 90 s timeout) after. Resist growing this.
- `lib/rpc-endpoint.ts` ships a default for devnet only, so a devnet build needs no environment. No mainnet endpoint lives in this repo: a mainnet build without `NEXT_PUBLIC_SOLANA_RPC_URL` fails. Read that variable with `||`, never `??` — Next inlines an empty `NEXT_PUBLIC_` assignment as `""`, which `??` keeps, and every call would then hit this app's own origin. Holders may override the endpoint from the wallet modal (localStorage, cluster-scoped key so a devnet override cannot leak into a mainnet build). `NEXT_PUBLIC_` RPC URLs are world-readable by nature — rate-limit and domain-restrict at the provider.
- No holder's key ever touches a server. The wallet signs and broadcasts; the app only watches the signature.
- The wallet chooser is a native `<dialog>` (top layer, no z-index). On mobile user agents with no wallet detected it offers Phantom/Solflare/Backpack universal links that reopen the page inside the wallet's own browser, where Wallet Standard registration works.
- `/dev/wallet` is the signing pipeline's acceptance harness: unlinked, noindex, one Memo transaction. It exists to prove a real wallet end to end on the configured cluster.

## Transaction toasts

`components/tx/tx-provider.tsx` — `useTx().track(label, signature)` hands a just-broadcast signature to the toast stack, which polls it to confirmed/failed/timeout with an explorer link. Signing itself stays inline button state ("Approve in wallet…"); a toast starts only once a signature exists. The toast viewport's `z-40` is the codebase's second and last z-index (the header is `z-30`; the dialog needs none). Kept separate from the wallet provider so 2-second poll ticks never re-render wallet consumers.

## Picker

The home page lists the connected wallet's Piggy SOL Gang twice, as candidates to upgrade and to burn, and a pair builder previews each pair's new art. Nothing signs yet: the Swap button stays disabled until the server route (PIG-194) and the client flow (PIG-203).

- `app/api/wallets/[address]/piggies/route.ts` is the picker's one read: the index says which piggies the wallet holds, the mint map what each becomes, `lib/rules.ts` what each may do. It is server-side because the mint map is. It checks the address before touching the index, answers `no-store` so a refresh after a swap sees the burn, and turns every index failure into `502 indexer_unavailable`. `lib/piggies.ts` holds the response shape and the browser's fetch.
- `lib/indexer.ts` (server-only) walks `/v1/wallets/{address}/nfts?collection=piggy-sol-gang`, at most 20 pages of 100. As in dressme, the index is trusted for *which* piggies a wallet holds, never for what they are or may do; the swap route proves ownership on chain. It indexes **mainnet only**, so a devnet build shows holders their mainnet piggies. That is fine for previewing, but a devnet swap rehearsal needs `INDEXER_URL` on a devnet index (PIG-116) first. Listed and staked piggies sit in an escrow, so they never appear, and the picker says so.
- `lib/rules.ts` keeps the migration rules and their wording together, **provisional until PIG-183**: Piggy SOL Gang in both roles, upgrading needs an entry in the mint map, and any live one can be burned. 15 live piggies have no entry today; the other 64 unmapped mints are burned. The route decides with it and the picker renders its sentences. Nothing is hidden: an ineligible piggy stays on the list with its reason, and other collections in the wallet are counted and explained.
- `lib/art.ts` names where the new art lives (`NEXT_PUBLIC_ART_BASE_URL`, default `assets.piggygang.net/piggy-gang/images/`, which 404s until PIG-198, so previews show the piggy mark) and `OPTIMIZED_PREFIXES`. `next.config.ts` turns that list into `images.remotePatterns` and `optimizable()` checks a src against it, so the two cannot drift. Exact prefixes, never wildcard hosts. It imports nothing, because `next.config.ts` loads it. The new art is 2,800 px and up to 3.6 MB per PNG; a picker card is a few KB once optimized.
- `components/picker/`: `use-piggies.ts` is dressme's keyed read. `<WalletPicker>` remounts per address (`key`), so switching accounts drops the picks. When a new read lands, `retain()` removes the picks it no longer allows from state, during render rather than in an effect, so a later read cannot quietly re-pick them; a failed refresh keeps the same data and drops nothing. The lists come before the pair builder in DOM order (pick, then review); from `lg` the builder is a sticky third column. A card that cannot play a role is `aria-disabled`, not `disabled`, so its reason stays reachable by keyboard.
- `/dev/picker?address=…` renders any wallet's picker without connecting it (unlinked, noindex): the way to check a wallet nobody on the team holds. Whatever wires up signing must sign only for the connected account, never for the address shown.

## Swap logic

The logic worth keeping from `piggy-upgrades`, rewritten. The picker uses the mint map (through its route) and `lib/pairs.ts`; the transaction shape waits for the server route (PIG-194) and the client flow (PIG-203). The rules all three enforce are decided in PIG-183.

- `lib/mint-map.json` is the old `mint_map_prod.json` flattened from an array of one-key objects to one object: the same 9,921 PSG mint → art id pairs in the same order. It is data of record, not generated. `lib/mint-map.ts` wraps it in a `Map` because mints arrive from clients and a plain object answers `constructor` and `__proto__`.
- `lib/metadata.ts` resolves a mint to its on-chain URI and JSON document. `METADATA_BASE_URL` defaults to our own domain even while files are still moving there, because every URI built from it is written on chain: until PIG-198 lands the default 404s, and a devnet rehearsal has to point the variable elsewhere. Never make a vendor host the default.
- `lib/pairs.ts` is pair selection as pure data over mint strings. A mint holds one role at most; pairs zip by pick order; `toPairs` is null until the lists are non-empty and equal.
- `lib/swap-transaction.ts` is the transaction's shape: `burnV1` × 2 then mpl-core `create`, holder as fee payer. It is **deliberately unguarded**, so it must never be reachable from a route that has not validated the pair against the chain — the old route co-signed whatever the client sent. The route also fills `collectionMetadata` from each mint's on-chain state, and creates the `Umi` instance: that brings `@metaplex-foundation/umi-bundle-defaults` and `@solana/web3.js` 1.x, whose `bufferutil` and `utf-8-validate` need `allowBuilds` entries.
- These modules are `server-only` (except `lib/pairs.ts`, which the picker needs), which turns a client import into a build error. That keeps Metaplex, the 700 KB table and `METADATA_BASE_URL` out of the client bundle.
- **A verified mint needs its collection's metadata account to burn**, sized or not: `burnV1` fails without it (`0x67`) or with another collection's (`0x68`), and the whole swap rolls back. No PSG has a collection today; PIG-223 verifies them in batches, so `collectionMetadata` is per role.
- **Liveness is the supply, not the metadata account.** A burned PSG's metadata account closes outright, as it already has for 1,801 mints in the table, but a fixture minted today paid the 0.01 SOL creation fee and leaves a 1-byte stub (key `Uninitialized`). Either way the token account and master edition close, the mint account stays and supply drops to 0.
- The update-delegate key can sign `create` alone: the collection's root authority is not needed, which is what PIG-226 relies on. Both burns and the create are one transaction, so a failed `create` leaves both piggies untouched.

## Keys

Nothing secret came from `piggy-upgrades` and nothing may: not its committed keypairs, not its hard-coded Helius key (PIG-181). The app's signing key is generated fresh per cluster (PIG-226), and lives only in a password manager and a Vercel sensitive variable, never in this repo or in a `NEXT_PUBLIC_` variable. `.gitignore` backstops the usual keypair file names and the old repo's.

- `piggy-upgrades` committed three keypairs. They are devnet test keys with no mainnet history, and they are not the team's: `3BxEGEe6Lcdpk7Pkb6JvV6BEyavoraS163jFpTpjmrgp`, `EKeBXmdFToES3z2yVmZVkMwTQVsws4yajnCq1RZQB2rc` and `3fhPZKMhXibS1hTGvkZHCS6V58LM4LeAcQ4E7g6cGXY5`. Two still hold about 1 devnet SOL each, which makes them tempting for a rehearsal: never sign with, fund or authorize any of them, on any cluster. Whatever loads the app's signing key (PIG-194) must refuse these three, and the collection's root authority too, because the app signs as its update delegate only.
- RPC keys, Helius or any other, are the team's own and come only from the environment. The browser's key is world-readable, so it must be domain-restricted; server-side reads (PIG-194) therefore get a key of their own, in a variable without the `NEXT_PUBLIC_` prefix.
