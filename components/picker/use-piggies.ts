"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWalletPiggies, type WalletPiggies } from "@/lib/piggies";

type Result = { attempt: number; data: WalletPiggies | null; error: string | null };

/**
 * One wallet's piggies, read on mount and again on refresh().
 *
 * DressMe's keyed-read idiom: each result is stored against the attempt that
 * produced it, and `reading` is derived — the newest attempt has no result yet
 * — rather than set and reset in effects. The picker remounts per address, so
 * the attempt counter is the whole key.
 *
 * A refresh keeps the last good list on screen while it runs, and keeps it if
 * the refresh fails, with the error shown above it: the list may be stale,
 * but the swap route checks every pair against the chain anyway.
 */
export function usePiggies(address: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    fetchWalletPiggies(address, controller.signal)
      .then((data) => {
        if (live) setResult({ attempt, data, error: null });
      })
      .catch((cause: unknown) => {
        // An abort means this attempt was superseded or unmounted.
        if (!live) return;
        const error = cause instanceof Error ? cause.message : "Couldn't read this wallet's piggies.";
        setResult((previous) => ({ attempt, data: previous?.data ?? null, error }));
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [address, attempt]);

  const refresh = useCallback(() => setAttempt((previous) => previous + 1), []);

  const current = result?.attempt === attempt;
  return {
    data: result?.data ?? null,
    // An older attempt's error would only contradict the retry in flight.
    error: current ? (result?.error ?? null) : null,
    reading: !current,
    refresh,
  };
}
