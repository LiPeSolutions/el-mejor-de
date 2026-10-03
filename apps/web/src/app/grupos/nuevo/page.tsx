import type { Metadata } from "next";
import { GroupForm } from "@/components/groups/GroupForm";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default function NewGroupPage() {
  return <GroupForm />;
}
