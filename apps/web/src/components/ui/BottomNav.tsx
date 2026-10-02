"use client";

import { Gamepad2, House, Trophy, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./cx";

const TABS = [
  { href: "/", label: "Hoy", Icon: House },
  { href: "/ranking", label: "Ranking", Icon: Trophy },
  { href: "/practicar", label: "Practicar", Icon: Gamepad2 },
  { href: "/grupos", label: "Grupos", Icon: Users },
  { href: "/perfil", label: "Perfil", Icon: User },
] as const;

/** Floating bottom navigation. Hidden during a challenge (screens just don't render it). */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+26px)] z-40 mx-auto w-[calc(100%-32px)] max-w-[398px]"
    >
      <ul className="grid grid-cols-5 rounded-full bg-white px-2 py-1.5 shadow-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px]",
                  active ? "bg-brand-100 font-extrabold text-brand" : "font-semibold text-ink-500",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={2.2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
