import type { Metadata } from "next";
import { connection } from "next/server";
import { ProfileScreen } from "@/components/account/ProfileScreen";
import { todayInfo } from "@/server/today";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  await connection(); // the streak and the week depend on today's date
  return <ProfileScreen today={todayInfo()} />;
}
