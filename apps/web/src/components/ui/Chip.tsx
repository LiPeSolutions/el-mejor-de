import type { ReactNode } from "react";
import { cx } from "./cx";

/** Small white pill (34 px), e.g. "Reto 1 de 3". */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "flex h-[34px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-bold shadow-[0_6px_16px_rgba(35,38,58,.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Uppercase section label (11 px). */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("text-[11px] font-bold uppercase tracking-[.06em] text-ink-500", className)}>{children}</div>;
}
