import type { Metadata } from "next";
import { connection } from "next/server";
import { DaySummary } from "@/components/day/DaySummary";
import { todayInfo } from "@/server/today";

export const metadata: Metadata = { title: "Resumen del día" };

export default async function DaySummaryPage() {
  await connection();
  return <DaySummary today={todayInfo()} />;
}
