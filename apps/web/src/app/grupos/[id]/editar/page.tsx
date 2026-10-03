import type { Metadata } from "next";
import { GroupForm } from "@/components/groups/GroupForm";

export const metadata: Metadata = { title: "Editar grupo" };

export default async function EditGroupPage(props: PageProps<"/grupos/[id]/editar">) {
  const { id } = await props.params;
  return <GroupForm groupId={id} />;
}
