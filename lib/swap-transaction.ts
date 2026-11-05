import "server-only";
import { create, type CreateArgs } from "@metaplex-foundation/mpl-core";
import { burnV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  createNoopSigner,
  publicKey,
  transactionBuilder,
  type PublicKey,
  type Signer,
  type TransactionBuilder,
  type Umi,
} from "@metaplex-foundation/umi";
import type { Pair, Role } from "@/lib/pairs";

export type SwapInput = {
  /** The holder's address: owns both burned mints, pays the fee, receives the new asset. */
  owner: string;
  pair: Pair;
  /**
   * Per role, the metadata account of the collection that mint is verified
   * into; leave the role out for a mint that is not. No PSG is verified yet and
   * PIG-223 verifies them in batches, so one pair can hold both states.
   */
  collectionMetadata?: Partial<Record<Role, PublicKey>>;
  /** The Piggy Gang Core collection, fetched: its plugins decide the extra accounts `create` needs. */
  collection: NonNullable<CreateArgs["collection"]>;
  /** A fresh keypair. A Core asset is its own account, so its address signs once, at birth. */
  asset: Signer;
  /** Signs for the collection: the app's update-delegate key, never the root authority. */
  authority: Signer;
  name: string;
  uri: string;
};

/**
 * One swap as one atomic transaction: burn both Piggy SOL Gang mints, create
 * the Piggy Gang asset. All three land or none do, so a holder can never lose
 * a piggy without receiving the new one.
 *
 * This is the transaction's shape and nothing else. It checks nothing, and the
 * key behind `authority` co-signs whatever it is handed — so a route must prove
 * the pair against the chain before calling this. The old route did not, which
 * let any Token Metadata NFT be burned in place of a piggy.
 *
 * The holder is a noop signer because their signature comes later, from the
 * wallet. buildAndSign() adds `asset` and `authority` and leaves the holder's
 * slot empty for it.
 */
export function buildSwapTransaction(
  umi: Umi,
  { owner, pair, collectionMetadata, collection, asset, authority, name, uri }: SwapInput,
): TransactionBuilder {
  const holderKey = publicKey(owner);
  const holder = createNoopSigner(holderKey);
  // `authority` is explicit on purpose: left out, burnV1 falls back to
  // umi.identity, which on the server is the app's key and owns neither mint.
  const burn = (role: Role) =>
    burnV1(umi, {
      authority: holder,
      mint: publicKey(pair[role]),
      tokenOwner: holderKey,
      tokenStandard: TokenStandard.NonFungible,
      collectionMetadata: collectionMetadata?.[role],
    });

  return transactionBuilder()
    .add(burn("burn"))
    .add(burn("upgrade"))
    .add(create(umi, { asset, collection, name, uri, authority, payer: holder, owner: holderKey }))
    .setFeePayer(holder);
}
