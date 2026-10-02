import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "neutral" | "ghost" | "gold" | "game" | "whatsapp";
type Size = "sm" | "md" | "lg" | "gold" | "start";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-btn active:bg-brand-600",
  secondary: "bg-white text-ink shadow-md active:bg-surface-2",
  neutral: "bg-surface-2 text-ink-700",
  ghost: "text-ink-700",
  gold: "bg-gold text-ink shadow-btn-gold",
  game: "bg-(--game) text-(--game-on) shadow-(--game-shadow)",
  whatsapp: "bg-whatsapp text-white shadow-[0_12px_24px_rgba(37,211,102,.35)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-12 px-4 text-sm font-bold",
  md: "h-[52px] px-5 text-base font-display font-extrabold",
  lg: "h-14 px-6 text-lg font-display font-extrabold",
  gold: "h-[66px] px-6 text-lg font-display font-extrabold",
  start: "h-[74px] px-6 text-[22px] font-display font-extrabold",
};

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Adds the top highlight the design uses on the big buttons. */
  shine?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function Button({
  children,
  variant = "primary",
  size = "lg",
  href,
  onClick,
  disabled,
  shine = size === "start" || size === "gold",
  className,
  type = "button",
}: ButtonProps) {
  const classes = cx(
    "relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full transition duration-150 ease-out active:scale-[.98] disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  const content = (
    <>
      {shine && <span aria-hidden className="absolute inset-0 bg-btn-shine" />}
      <span className="relative flex items-center gap-2.5">{children}</span>
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
