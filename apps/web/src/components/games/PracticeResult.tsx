"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Screen } from "@/components/ui/Screen";
import { gameBySlug, type GameSlug } from "@/lib/games";
import { useClientValue } from "@/lib/hooks";
import { lastPracticeResult } from "@/lib/storage";
import { LargadaResult } from "@/components/largada/LargadaResult";
import { GameResultView } from "./GameResultView";

/** Result of the practice game that just ended (kept for this tab only). */
export function PracticeResult({ slug }: { slug: GameSlug }) {
  const game = gameBySlug(slug)!;
  const router = useRouter();
  // false = nothing saved (e.g. the link was opened directly).
  const last = useClientValue(() => lastPracticeResult(game.id) ?? false, game.id);

  useEffect(() => {
    if (last === false) router.replace(`/practicar/${slug}`);
  }, [last, router, slug]);

  if (!last) return <Screen>{null}</Screen>;
  if (last.result.game === "reflexes" && last.result.version === "largada") {
    return <LargadaResult game={game} result={last.result} practice isRecord={last.isRecord} previous={last.previous?.score ?? null} againHref={`/practicar/${slug}`} />;
  }
  return (
    <GameResultView
      game={game}
      result={last.result}
      practice
      isRecord={last.isRecord}
      previous={last.previous?.score ?? null}
      againHref={`/practicar/${slug}`}
    />
  );
}
