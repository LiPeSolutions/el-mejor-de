import { DEFAULT_AVATAR, type Article } from "@repo/shared";
import type { BattleView } from "@/lib/battle-types";
import type { BattleFace } from "./parts";

export interface BattlePerson extends BattleFace {
  article: Article;
  isMe: boolean;
}

/** Everyone the battle shows, by account: names, characters and who's me. */
export function peopleOf(view: BattleView): (userId: string) => BattlePerson {
  const byId = new Map(view.players.map((player) => [player.userId, player]));
  return (userId) => {
    const player = byId.get(userId);
    return player
      ? { key: player.userId, name: player.username, avatar: player.avatar, isMe: player.me, article: player.article }
      : { key: userId, name: "Alguien", avatar: DEFAULT_AVATAR, isMe: userId === view.meId, article: "el" };
  };
}

/** Where to go after leaving: the group, or practice. */
export const homeOf = (view: Pick<BattleView, "group"> | null) => (view?.group ? `/grupos/${view.group.id}` : "/practicar");
