import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeRunner } from "@/components/games/ChallengeRunner";
import { GAME_LIST, gameBySlug } from "@/lib/games";

export function generateStaticParams() {
  return GAME_LIST.map((game) => ({ juego: game.slug }));
}

export async function generateMetadata(props: PageProps<"/practicar/[juego]">): Promise<Metadata> {
  const { juego } = await props.params;
  const game = gameBySlug(juego);
  return { title: game ? `Práctica · ${game.name}` : undefined };
}

export default async function PracticePlayPage(props: PageProps<"/practicar/[juego]">) {
  const { juego } = await props.params;
  const game = gameBySlug(juego);
  if (!game) notFound();
  return <ChallengeRunner mode="practice" slug={game.slug} />;
}
