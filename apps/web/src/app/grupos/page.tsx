import type { Metadata } from "next";
import { GroupsHome } from "@/components/groups/GroupsHome";

export const metadata: Metadata = { title: "Grupos" };

export default function GroupsPage() {
  return <GroupsHome />;
}
