import type { Metadata } from "next";
import { connection } from "next/server";
import { PracticeHome } from "@/components/practice/PracticeHome";
import { todayInfo } from "@/server/today";

export const metadata: Metadata = { title: "Practicar" };

export default async function PracticePage() {
  await connection(); // shows which of today's challenges are still pending
  return <PracticeHome today={todayInfo()} />;
}
