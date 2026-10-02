import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { DailyResult } from "@/components/games/DailyResult";
import { gameBySlug } from "@/lib/games";
import { todayInfo } from "@/server/today";

export async function generateMetadata(props: PageProps<"/jugar/[juego]/resultado">): Promise<Metadata> {
  const { juego } = await props.params;
  const game = gameBySlug(juego);
  return { title: game ? `Resultado · ${game.name}` : undefined };
}

export default async function DailyResultPage(props: PageProps<"/jugar/[juego]/resultado">) {
  await connection();
  const { juego } = await props.params;
  const game = gameBySlug(juego);
  if (!game) notFound();
  const today = todayInfo();
  const slot = today.lineup.indexOf(game.id);
  if (slot === -1) redirect(`/jugar/${game.slug}`);
  return <DailyResult today={today} slot={slot} />;
}
