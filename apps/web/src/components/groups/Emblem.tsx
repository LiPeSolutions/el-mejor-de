import type { GroupColor, GroupEmblem as EmblemId } from "@repo/shared";
import { BriefcaseBusiness, Coffee, GraduationCap, Heart, House, Music, Star, Volleyball, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/cx";

/** The 8 emblems of design 32 (Lucide icons, so they look the same on every phone). */
export const EMBLEM_ICONS: Record<EmblemId, LucideIcon> = {
  casa: House,
  maletin: BriefcaseBusiness,
  pelota: Volleyball,
  birrete: GraduationCap,
  mate: Coffee,
  musica: Music,
  corazon: Heart,
  estrella: Star,
};

export const EMBLEM_NAMES: Record<EmblemId, string> = {
  casa: "Casa",
  maletin: "Maletín",
  pelota: "Pelota",
  birrete: "Birrete",
  mate: "Mate",
  musica: "Música",
  corazon: "Corazón",
  estrella: "Estrella",
};

/** Each color: the tile, what goes on it, and a deeper tone for icons on white. */
export const GROUP_COLOR_VALUES: Record<GroupColor, { fill: string; on: string; deep: string }> = {
  azul: { fill: "#4F6BFF", on: "#FFFFFF", deep: "#4F6BFF" },
  coral: { fill: "#FF6B4A", on: "#FFFFFF", deep: "#E2553A" },
  violeta: { fill: "#8B6CFF", on: "#FFFFFF", deep: "#6A4FD6" },
  turquesa: { fill: "#2EC4B6", on: "#FFFFFF", deep: "#158A7F" },
  dorado: { fill: "#FFC53D", on: "#23263A", deep: "#B07812" },
  rosa: { fill: "#FF7AA2", on: "#FFFFFF", deep: "#D9557F" },
  tinta: { fill: "#23263A", on: "#FFFFFF", deep: "#23263A" },
};

export const GROUP_COLOR_NAMES: Record<GroupColor, string> = {
  azul: "Azul",
  coral: "Coral",
  violeta: "Violeta",
  turquesa: "Turquesa",
  dorado: "Dorado",
  rosa: "Rosa",
  tinta: "Tinta",
};

/** The group's emblem on a tile of its color (48 px in the lists). */
export function GroupEmblem({
  emblem,
  color,
  size = 48,
  className,
}: {
  emblem: EmblemId;
  color: GroupColor;
  size?: number;
  className?: string;
}) {
  const Icon = EMBLEM_ICONS[emblem];
  const { fill, on } = GROUP_COLOR_VALUES[color];
  return (
    <span
      aria-hidden
      className={cx("grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size, borderRadius: size / 3, background: fill, color: on }}
    >
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.3} />
    </span>
  );
}
