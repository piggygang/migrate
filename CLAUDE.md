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
- `pnpm-workspace.yaml` exists only for pnpm settings; sharp is **enabled** (unlike dressme), so `next/image` is usable once the picker's art previews land — add `images.remotePatterns` to `next.config.ts` at that point. pnpm 11 stops on any build script not listed under `allowBuilds`, so a new dependency that has one needs an explicit entry.

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

## Swap logic

The logic worth keeping from `piggy-upgrades`, rewritten. No route or page calls it yet: the picker (PIG-193), the server route (PIG-194) and the client flow (PIG-203) do, and the rules they enforce are decided in PIG-183.

- `lib/mint-map.json` is the old `mint_map_prod.json` flattened from an array of one-key objects to one object: the same 9,921 PSG mint → art id pairs in the same order. It is data of record, not generated. `lib/mint-map.ts` wraps it in a `Map` because mints arrive from clients and a plain object answers `constructor` and `__proto__`.
- `lib/metadata.ts` resolves a mint to its on-chain URI and JSON document. `METADATA_BASE_URL` defaults to our own domain even while files are still moving there, because every URI built from it is written on chain: until PIG-198 lands the default 404s, and a devnet rehearsal has to point the variable elsewhere. Never make a vendor host the default.
- `lib/pairs.ts` is pair selection as pure data over mint strings. A mint holds one role at most; pairs zip by pick order; `toPairs` is null until the lists are non-empty and equal.
- `lib/swap-transaction.ts` is the transaction's shape: `burnV1` × 2 then mpl-core `create`, holder as fee payer. It is **deliberately unguarded**, so it must never be reachable from a route that has not validated the pair against the chain — the old route co-signed whatever the client sent. The route also fills `collectionMetadata` from each mint's on-chain state, and creates the `Umi` instance: that brings `@metaplex-foundation/umi-bundle-defaults` and `@solana/web3.js` 1.x, whose `bufferutil` and `utf-8-validate` need `allowBuilds` entries.
- These modules are `server-only` (except `lib/pairs.ts`, which the picker needs), which turns a client import into a build error. That keeps Metaplex, the 700 KB table and `METADATA_BASE_URL` out of the client bundle.
- **A verified mint needs its collection's metadata account to burn**, sized or not: `burnV1` fails without it (`0x67`) or with another collection's (`0x68`), and the whole swap rolls back. No PSG has a collection today; PIG-223 verifies them in batches, so `collectionMetadata` is per role.
- **Liveness is the supply, not the metadata account.** A burned PSG's metadata account closes outright, as it already has for 1,801 mints in the table, but a fixture minted today paid the 0.01 SOL creation fee and leaves a 1-byte stub (key `Uninitialized`). Either way the token account and master edition close, the mint account stays and supply drops to 0.
- The update-delegate key can sign `create` alone: the collection's root authority is not needed, which is what PIG-226 relies on. Both burns and the create are one transaction, so a failed `create` leaves both piggies untouched.

## Keys

Nothing secret came from `piggy-upgrades` and nothing may: not its committed keypairs, not its hard-coded Helius key (PIG-181). The app's signing key is generated fresh per cluster (PIG-226), and lives only in a password manager and a Vercel sensitive variable, never in this repo or in a `NEXT_PUBLIC_` variable.
