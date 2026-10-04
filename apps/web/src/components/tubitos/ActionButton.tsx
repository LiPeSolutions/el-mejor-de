"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/** The two white buttons under the board: dimmed when there's nothing to undo, breathing when stuck. */
export function ActionButton({ children, onClick, off = false, breathe }: { children: ReactNode; onClick: () => void; off?: boolean; breathe: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={off}
      className={cx(
        "flex h-14 items-center justify-center gap-[9px] rounded-full bg-white font-display text-[17px] font-extrabold shadow-[0_8px_20px_rgba(35,38,58,.08)] transition active:scale-[.98]",
        off && "opacity-45",
        breathe && "animate-breathe",
      )}
    >
      {children}
    </button>
  );
}
