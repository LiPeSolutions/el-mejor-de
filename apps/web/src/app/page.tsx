import { connection } from "next/server";
import { HomeScreen } from "@/components/home/HomeScreen";
import { todayInfo } from "@/server/today";

export default async function Home() {
  await connection(); // today's challenges depend on the request date
  return <HomeScreen today={todayInfo()} />;
}
