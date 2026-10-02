"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

/** Milliseconds left until `target`, refreshed every second. Reloads the page when it hits zero. */
export function useCountdown(target: string): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => {
      const remaining = end - Date.now();
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) window.location.reload();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return left;
}

const noSubscription = () => () => {};

/** False on the server and while hydrating; true once the page runs in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/**
 * Runs `load` only in the browser, so localStorage reads never break server rendering.
 * It runs again when `key` changes (e.g. the game date).
 */
export function useClientValue<T>(load: () => T, key: string): T | null {
  const isClient = useIsClient();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies what `load` reads
  return useMemo(() => (isClient ? load() : null), [isClient, key]);
}
