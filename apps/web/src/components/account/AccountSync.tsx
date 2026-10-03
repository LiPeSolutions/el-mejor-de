"use client";

import { useEffect } from "react";
import { loadAccount, saveAccount } from "@/lib/account";
import { accountApi } from "@/lib/api";
import { mergeAccountDays } from "@/lib/storage";

/**
 * Once per visit, asks the server who is signed in (the session cookie is
 * httpOnly) and updates the browser's copy. A browser that didn't know the
 * account, or knew another one, also gets its recent attempts.
 */
export function AccountSync() {
  useEffect(() => {
    const known = loadAccount();
    accountApi
      .me(!known)
      .then(async ({ account, history }) => {
        if (!account) {
          if (loadAccount()) saveAccount(null);
          return;
        }
        const days = history ?? (known?.id === account.id ? null : (await accountApi.me(true)).history);
        if (days) mergeAccountDays(account.id, days);
        saveAccount(account);
      })
      .catch(() => {
        // Offline: keep what the browser knew.
      });
  }, []);
  return null;
}
