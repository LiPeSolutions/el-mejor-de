import type { ReactNode } from "react";
import { cx } from "./cx";

export type ToastTone = "success" | "danger" | "gold" | "info";

const TONES: Record<ToastTone, string> = {
  success: "bg-success text-white shadow-[0_8px_18px_rgba(31,160,147,.35)]",
  danger: "bg-danger text-white shadow-[0_8px_18px_rgba(226,80,76,.35)]",
  gold: "bg-gold text-ink shadow-[0_8px_18px_rgba(255,197,61,.4)]",
  info: "bg-brand text-white shadow-[0_8px_18px_rgba(79,107,255,.35)]",
};

/** Feedback pill: always icon + text, never color alone. */
export function Toast({ tone, icon, children, className }: { tone: ToastTone; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cx("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-extrabold", TONES[tone], className)}
    >
      {icon}
      {children}
    </div>
  );
}
