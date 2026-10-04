"use client";

import { toGameDate } from "@repo/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { battlesApi } from "@/lib/api";
import type { GroupBattlesResponse } from "@/lib/battle-types";
import { GAMES } from "@/lib/games";
import { namesList } from "@/lib/largada";
import { BattleHistory, type PastBattle, type WinsRow } from "./BattleHistory";
import { BattleStrip } from "./BattleStrip";

/** How often the group checks for a live battle while it's open. */
const CHECK_EVERY_MS = 10_000;

export interface GroupBattles extends GroupBattlesResponse {
  /** The game date when it arrived, to say "Hoy" and "Ayer". */
  today: string;
}

/** The group's live battle and tally, checked again every few seconds while the screen is open. */
export function useGroupBattles(groupId: string) {
  const [data, setData] = useState<GroupBattles | null>(null);
  const load = useCallback(
    () =>
      battlesApi.group(groupId).then(
        (response) => setData({ ...response, today: toGameDate(new Date()) }),
        () => undefined,
      ),
    [groupId],
  );
  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);
  return data;
}

/** "Batalla en vivo" at the top of the group: open one, or join the one that's on. */
export function GroupBattleStrip({ groupId, battles, className }: { groupId: string; battles: GroupBattles | null; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const live = battles?.live ?? null;

  const create = () => {
    setBusy(true);
    battlesApi.open(groupId).then(
      ({ battleId }) => router.push(`/batalla/${battleId}`),
      () => setBusy(false),
    );
  };
  const open = () => {
    if (!live) return;
    if (live.in) {
      router.push(`/batalla/${live.battleId}`);
      return;
    }
    setBusy(true);
    battlesApi.joinFromGroup(live.battleId).then(
      () => router.push(`/batalla/${live.battleId}`),
      () => setBusy(false),
    );
  };

  return (
    <BattleStrip
      className={className}
      busy={busy}
      onCreate={create}
      onOpen={open}
      live={
        live
          ? {
              hostName: live.hostName,
              game: GAMES[live.game],
              players: live.players.map((player) => ({ key: player.userId, name: player.username, avatar: player.avatar })),
              playing: live.playing,
              in: live.in,
            }
          : null
      }
    />
  );
}

const TIME = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false });
const WEEKDAY = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short" });

/** "Hoy 18:40", "Ayer 22:05", "Sáb 3/10". */
function whenText(at: number, today: string): string {
  const date = new Date(at);
  const day = toGameDate(date);
  if (day === today) return `Hoy ${TIME.format(date)}`;
  const yesterday = toGameDate(new Date(Date.parse(`${today}T12:00:00-03:00`) - 24 * 60 * 60 * 1000));
  if (day === yesterday) return `Ayer ${TIME.format(date)}`;
  const weekday = WEEKDAY.format(date).replace(".", "");
  const [, month, dayOfMonth] = day.split("-");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${Number(dayOfMonth)}/${Number(month)}`;
}

/** The group's "Batallas" tab. */
export function GroupBattleTab({ battles }: { battles: GroupBattles | null }) {
  if (!battles) return <div className="h-40" aria-hidden />;
  const rows: WinsRow[] = battles.wins.map((row) => ({
    key: row.userId,
    name: row.username,
    avatar: row.avatar,
    score: row.wins,
    isMe: row.isMe,
    place: 1 + battles.wins.filter((other) => other.wins > row.wins).length,
  }));
  const recent: PastBattle[] = battles.recent.map((match) => ({
    id: match.id,
    game: GAMES[match.game],
    when: whenText(match.endedAt, battles.today),
    winnerName: namesList(match.winners.map((winner) => winner.username)),
    winnerIsMe: battles.wins.some((row) => row.isMe && match.winners.some((winner) => winner.userId === row.userId)),
    players: match.players,
  }));
  return <BattleHistory rows={rows} recent={recent} />;
}
