"use client";

import { useCallback, useEffect, useState } from "react";

interface Loaded<T> {
  key: string;
  data?: T;
  error?: unknown;
}

/**
 * Loads something from the API in the browser, again whenever `key` changes
 * (null: don't load yet). While reloading it keeps showing what it had.
 */
export function useRequest<T>(key: string | null, load: () => Promise<T>) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [round, setRound] = useState(0);
  const requestKey = key === null ? null : `${key}#${round}`;

  useEffect(() => {
    if (requestKey === null) return;
    let alive = true;
    load().then(
      (data) => alive && setLoaded({ key: requestKey, data }),
      (error: unknown) => alive && setLoaded({ key: requestKey, error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies what `load` asks for
  }, [requestKey]);

  const current = loaded && loaded.key === requestKey ? loaded : null;
  const sameThing = loaded !== null && key !== null && loaded.key.startsWith(`${key}#`);
  return {
    data: current ? current.data : sameThing ? loaded.data : undefined,
    error: current?.error,
    loading: current === null,
    reload: useCallback(() => setRound((value) => value + 1), []),
    /** Replaces what's shown, e.g. with what an action answered. */
    replace: useCallback((data: T) => requestKey !== null && setLoaded({ key: requestKey, data }), [requestKey]),
  };
}
