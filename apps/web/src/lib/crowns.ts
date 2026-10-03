"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { groupsApi } from "./api";

/*
 * On Monday the winners see their celebration. The home screen asks the
 * server for crowns now and then (which also decides the weeks that just
 * closed) and opens /corona when there's one not seen yet.
 */

const CHECKED_KEY = "emd:coronas-revisadas";
const RECHECK_MS = 15 * 60_000;

function lastCheck(accountId: string): number | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(CHECKED_KEY) ?? "null") as { id?: string; at?: number } | null;
    return value?.id === accountId && typeof value.at === "number" ? value.at : null;
  } catch {
    return null;
  }
}

function rememberCheck(accountId: string): void {
  try {
    window.sessionStorage.setItem(CHECKED_KEY, JSON.stringify({ id: accountId, at: Date.now() }));
  } catch {
    // Storage blocked: it just asks again next time.
  }
}

/** Opens the celebration when the signed-in player has a crown they haven't seen. */
export function useNewCrowns(accountId: string | null | undefined): void {
  const router = useRouter();
  useEffect(() => {
    if (!accountId) return;
    const last = lastCheck(accountId);
    if (last !== null && Date.now() - last < RECHECK_MS) return;
    let alive = true;
    groupsApi.crowns().then(
      ({ crowns }) => {
        if (!alive) return;
        rememberCheck(accountId);
        if (crowns.some((crown) => !crown.seen)) router.push("/corona");
      },
      () => {
        // Offline or no database: no celebration this time.
      },
    );
    return () => {
      alive = false;
    };
  }, [accountId, router]);
}
