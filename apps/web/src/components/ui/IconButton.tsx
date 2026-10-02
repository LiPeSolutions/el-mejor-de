import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

interface IconButtonProps {
  label: string;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** "light" for dark or colored backgrounds. */
  tone?: "white" | "light" | "glass";
  className?: string;
}

const TONES = {
  white: "bg-white shadow-[0_6px_16px_rgba(35,38,58,.08)]",
  light: "bg-white/12 text-white",
  glass: "bg-white/40",
};

/** Round 38 px button for closing or going back. */
export function IconButton({ label, children, href, onClick, tone = "white", className }: IconButtonProps) {
  const classes = cx("grid size-[38px] shrink-0 place-items-center rounded-full active:scale-95 transition", TONES[tone], className);
  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
