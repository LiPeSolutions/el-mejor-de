import type { Metadata } from "next";
import { BattleRoom } from "@/components/battle/BattleRoom";

export const metadata: Metadata = { title: "Batalla" };

/** A live battle: the room, the game and the podium. */
export default async function BattlePage(props: PageProps<"/batalla/[id]">) {
  const { id } = await props.params;
  return <BattleRoom id={id} />;
}
