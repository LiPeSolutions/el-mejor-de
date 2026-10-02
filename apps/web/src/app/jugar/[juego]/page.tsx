import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ChallengeRunner } from "@/components/games/ChallengeRunner";
import { RestingGame } from "@/components/games/RestingGame";
import { gameBySlug } from "@/lib/games";
import { todayInfo } from "@/server/today";

export async function generateMetadata(props: PageProps<"/jugar/[juego]">): Promise<Metadata> {
  const { juego } = await props.params;
  return { title: gameBySlug(juego)?.name };
}

/** Today's challenge for this game, or a "rests today" screen when it isn't in today's lineup. */
export default async function PlayPage(props: PageProps<"/jugar/[juego]">) {
  await connection(); // today's lineup depends on the request date
  const { juego } = await props.params;
  const game = gameBySlug(juego);
  if (!game) notFound();
  const today = todayInfo();
  const slot = today.lineup.indexOf(game.id);
  if (slot === -1) return <RestingGame slug={game.slug} />;
  return <ChallengeRunner mode="daily" slug={game.slug} slot={slot} position={slot + 1} date={today.date} />;
}
