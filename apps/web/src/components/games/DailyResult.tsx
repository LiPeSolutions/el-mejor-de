"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Screen } from "@/components/ui/Screen";
import { daySlots, pendingSlots } from "@/lib/day";
import { GAMES } from "@/lib/games";
import { useClientValue } from "@/lib/hooks";
import { loadDay } from "@/lib/storage";
import type { TodayInfo } from "@/lib/today-types";
import { LargadaResult } from "@/components/largada/LargadaResult";
import { GameResultView } from "./GameResultView";

/** Result of one of today's challenges, read from what this browser saved when it was graded. */
export function DailyResult({ today, slot }: { today: TodayInfo; slot: number }) {
  const router = useRouter();
  const slots = useClientValue(() => daySlots(today, loadDay(today.date)), today.date);
  const current = slots?.[slot];
  const missing = slots !== null && !current?.result;

  // Nothing graded yet for this challenge: back to the challenge itself.
  useEffect(() => {
    if (missing) router.replace(`/jugar/${GAMES[today.lineup[slot]!].slug}`);
  }, [missing, router, slot, today.lineup]);

  if (!slots || !current?.result) return <Screen>{null}</Screen>;

  const next = pendingSlots(slots)[0];
  const nextLink = next
    ? { href: `/jugar/${next.game.slug}`, label: "Siguiente reto", note: `${next.game.name} · ${next.game.duration}` }
    : { href: "/hoy/resumen", label: "Ver resumen del día", note: "Jugaste los 3 retos de hoy" };

  const result = current.result;
  if (result.game === "reflexes" && result.version === "largada") {
    return <LargadaResult game={current.game} result={result} practice={false} position={slot + 1} date={today.date} next={nextLink} />;
  }
  return <GameResultView game={current.game} result={result} practice={false} position={slot + 1} next={nextLink} />;
}
