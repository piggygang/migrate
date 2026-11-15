"use client";

import Image from "next/image";
import { useState } from "react";
import { PiggyMark } from "@/components/brand/wordmark";
import { optimizable } from "@/lib/art";

/**
 * A piggy's art, filling its positioned parent, in whatever state the file is.
 *
 * Hosts in lib/art.ts go through next/image, which turns a 2,800 px, 3 MB PNG
 * into the cell it is drawn in. Anything else keeps a plain <img>, because
 * next/image answers 400 for a src outside remotePatterns rather than
 * degrading (eslint.config.mjs scopes the no-img-element override to this
 * file). No src, a host the index has found dead and a load that fails in
 * front of us all show the piggy mark, and none of them shifts the layout.
 *
 * The picker renders these only after its read lands, so React has attached
 * onError before any request starts — no hydration race to guard against.
 */
export function PiggyImage({ src, alt, sizes }: { src: string | null; alt: string; sizes: string }) {
  // The src that failed rather than a flag, so a new src gets a fresh try
  // without an effect to reset anything.
  const [failed, setFailed] = useState<string | null>(null);

  if (!src || failed === src) {
    return (
      <span
        {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
        className="absolute inset-0 flex items-center justify-center"
      >
        <PiggyMark className="h-1/3 w-1/3 opacity-25" />
      </span>
    );
  }

  const onError = () => setFailed(src);
  return optimizable(src) ? (
    <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" onError={onError} />
  ) : (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      onError={onError}
    />
  );
}
