import type { PlaceLevel } from "@repo/shared";
import type { Metadata } from "next";
import { connection } from "next/server";
import { RankingScreen } from "@/components/ranking/RankingScreen";
import { todayInfo } from "@/server/today";

export const metadata: Metadata = { title: "Ranking" };

const LEVELS: Record<string, PlaceLevel> = { localidad: "locality", provincia: "province", pais: "country" };

/** The ranking of your barrio or town (`?nivel=localidad`), province or country. */
export default async function RankingPage(props: PageProps<"/ranking">) {
  await connection(); // the day number depends on the request date
  const { nivel } = await props.searchParams;
  return <RankingScreen today={todayInfo()} level={(typeof nivel === "string" && LEVELS[nivel]) || "locality"} />;
}
