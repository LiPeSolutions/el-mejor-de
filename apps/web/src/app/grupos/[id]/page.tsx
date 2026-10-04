import type { Metadata } from "next";
import { GroupScreen } from "@/components/groups/GroupScreen";

export const metadata: Metadata = { title: "Grupo" };

/** A group's ranking. `?invitar=1` opens the invitation right away (after creating it); `?vista=batallas`, its battles. */
export default async function GroupPage(props: PageProps<"/grupos/[id]">) {
  const [{ id }, { invitar, vista }] = await Promise.all([props.params, props.searchParams]);
  return <GroupScreen id={id} invite={invitar === "1"} tab={vista === "batallas" ? "battles" : undefined} />;
}
