import type { Metadata } from "next";
import { GroupSettings } from "@/components/groups/GroupSettings";

export const metadata: Metadata = { title: "Miembros y ajustes" };

export default async function GroupSettingsPage(props: PageProps<"/grupos/[id]/ajustes">) {
  const { id } = await props.params;
  return <GroupSettings id={id} />;
}
