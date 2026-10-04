import { useEffect, useState } from "react";

/*
 * "Se guarda solo" (editing the character): each change goes out 600 ms
 * after the last one, never two requests at a time, and the last change wins.
 */

export type SaveStatus = { state: "idle" } | { state: "saving" } | { state: "saved" } | { state: "failed"; cause: unknown };

export interface Autosave<T> {
  /** A new value: it goes out once the changes rest for a moment. */
  change(value: T): void;
  /** Sends what's pending now, without waiting; true once everything is saved. */
  flush(): Promise<boolean>;
  /** Something not saved yet: waiting, on its way or failed. */
  pending(): boolean;
  /** Whether the last try failed. */
  failed(): boolean;
}

export function createAutosave<T>(
  save: (value: T) => Promise<void>,
  onStatus: (status: SaveStatus) => void,
  { delayMs = 600, savedMs = 2000 }: { delayMs?: number; savedMs?: number } = {},
): Autosave<T> {
  let unsent: { value: T } | null = null;
  let sending: Promise<boolean> | null = null;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let rest: ReturnType<typeof setTimeout> | undefined;
  let status: SaveStatus["state"] = "idle";

  const emit = (next: SaveStatus) => {
    if (next.state === status && next.state !== "failed") return;
    status = next.state;
    onStatus(next);
  };

  const send = async (): Promise<boolean> => {
    while (unsent) {
      const { value } = unsent;
      unsent = null;
      try {
        await save(value);
      } catch (cause) {
        // A newer change, if one came, is the one to try again.
        unsent ??= { value };
        emit({ state: "failed", cause });
        return false;
      }
      // Still changing: what came meanwhile waits for its own moment of rest.
      if (unsent && debounce !== undefined) return true;
    }
    emit({ state: "saved" });
    rest = setTimeout(() => emit({ state: "idle" }), savedMs);
    return true;
  };

  const flush = (): Promise<boolean> => {
    clearTimeout(debounce);
    debounce = undefined;
    if (sending) return sending.then((saved) => (saved && unsent ? flush() : saved));
    if (!unsent) return Promise.resolve(status !== "failed");
    clearTimeout(rest);
    emit({ state: "saving" });
    sending = send().finally(() => {
      sending = null;
    });
    return sending;
  };

  return {
    change(value) {
      unsent = { value };
      clearTimeout(rest);
      clearTimeout(debounce);
      emit({ state: "saving" });
      debounce = setTimeout(() => {
        debounce = undefined;
        void flush();
      }, delayMs);
    },
    flush,
    pending: () => unsent !== null || sending !== null,
    failed: () => status === "failed",
  };
}

/** The autosave for a screen: it tries again when the connection comes back, and sends what's left when the screen goes. */
export function useAutosave<T>(save: (value: T) => Promise<void>): [SaveStatus, Autosave<T>] {
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [saver] = useState(() => createAutosave(save, setStatus));
  useEffect(() => {
    const retry = () => {
      if (saver.failed()) void saver.flush();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden" && saver.pending()) void saver.flush();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", hidden);
      if (saver.pending()) void saver.flush();
    };
  }, [saver]);
  return [status, saver];
}
