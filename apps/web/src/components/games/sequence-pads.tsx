"use client";

import { Heart, Moon, Star, Zap, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/cx";

/*
 * Secuencia's four pads, shared by the daily challenge and the live
 * battles. Each pad has its own color, corner, shape and icon: nothing
 * depends on color alone.
 */

export const PADS: Array<{ label: string; Icon: LucideIcon; bg: string; fg: string; corner: string; shadow: string; ring: string }> = [
  { label: "Estrella", Icon: Star, bg: "bg-letras", fg: "text-white", corner: "rounded-[32px_12px_12px_12px]", shadow: "rgba(255,107,74,.3)", ring: "#FF6B4A" },
  { label: "Luna", Icon: Moon, bg: "bg-preguntas", fg: "text-white", corner: "rounded-[12px_32px_12px_12px]", shadow: "rgba(139,108,255,.3)", ring: "#8B6CFF" },
  { label: "Rayo", Icon: Zap, bg: "bg-reflejos", fg: "text-white", corner: "rounded-[12px_12px_12px_32px]", shadow: "rgba(46,196,182,.3)", ring: "#2EC4B6" },
  { label: "Corazón", Icon: Heart, bg: "bg-secuencia", fg: "text-ink", corner: "rounded-[12px_12px_32px_12px]", shadow: "rgba(255,197,61,.35)", ring: "#FFC53D" },
];

/** The 2 × 2 pads. `active` lights one up; they act on touch, with the moment it happened. */
export function SequencePads({ active, enabled, onPress, className }: { active: number | null; enabled: boolean; onPress: (pad: number, at: number) => void; className?: string }) {
  return (
    <div className={cx("grid grid-cols-2 gap-3 px-8 pt-4", className)}>
      {PADS.map(({ label, Icon, bg, fg, corner, shadow, ring }, pad) => {
        const lit = active === pad;
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            disabled={!enabled}
            onPointerDown={() => enabled && onPress(pad, performance.now())}
            className={cx("grid aspect-square place-items-center transition duration-150 select-none", bg, fg, corner, lit && "scale-[1.04]")}
            style={{
              boxShadow: lit ? `0 0 0 6px #fff, 0 0 0 10px ${ring}, 0 16px 30px ${shadow.replace(/[\d.]+\)$/, ".45)")}` : `0 10px 22px ${shadow}`,
            }}
          >
            <Icon className={cx("size-12", pad === 3 ? "fill-ink" : "fill-white")} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}
