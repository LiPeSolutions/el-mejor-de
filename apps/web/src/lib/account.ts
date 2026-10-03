import { useMemo, useSyncExternalStore } from "react";
import type { PublicAccount } from "./account-types";

/*
 * The signed-in account as this browser remembers it, to draw screens right
 * away. The session itself is an httpOnly cookie: AccountSync checks it with
 * the server on every visit and updates this copy.
 */

const ACCOUNT_KEY = "emd:cuenta";
const LAST_USERNAME_KEY = "emd:ultimo-apodo";
const CHANGE_EVENT = "emd:cuenta";

function rawAccount(): string | null {
  try {
    return window.localStorage.getItem(ACCOUNT_KEY);
  } catch {
    return null;
  }
}

let parsed: { raw: string | null; account: PublicAccount | null } = { raw: null, account: null };

function parse(raw: string | null): PublicAccount | null {
  if (raw === parsed.raw) return parsed.account;
  let account: PublicAccount | null = null;
  try {
    const value = raw ? (JSON.parse(raw) as PublicAccount) : null;
    if (typeof value?.id === "string" && typeof value.username === "string") account = value;
  } catch {
    // A broken copy counts as signed out; AccountSync fixes it.
  }
  parsed = { raw, account };
  return account;
}

export function loadAccount(): PublicAccount | null {
  return parse(rawAccount());
}

export function saveAccount(account: PublicAccount | null): void {
  try {
    if (account) {
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
      window.localStorage.setItem(LAST_USERNAME_KEY, account.username);
    } else {
      window.localStorage.removeItem(ACCOUNT_KEY);
    }
  } catch {
    // Storage blocked (private mode): the cookie still signs the browser in.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The last apodo that signed in on this browser, to fill in "Entrar". */
export function lastUsername(): string | null {
  try {
    return window.localStorage.getItem(LAST_USERNAME_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCOUNT_KEY || event.key === null) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The account (null when signed out), or undefined until the browser has read it. */
export function useAccount(): PublicAccount | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, rawAccount, () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parse(raw)), [raw]);
}
