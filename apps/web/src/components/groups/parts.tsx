"use client";

import { Crown } from "lucide-react";
import type { ReactNode } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { cx } from "@/components/ui/cx";
import type { CrownNotice } from "@/lib/crown-watch";

/** "Juli te sacó la corona…" / "¡Le sacaste la corona…!", once per change. */
export function CrownNotices({ notices }: { notices: readonly CrownNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2 px-5 pt-3" aria-live="polite">
      {notices.map((notice) => (
        <li
          key={`${notice.groupId}:${notice.kind}`}
          className={cx(
            "flex items-center gap-2.5 rounded-row px-3.5 py-2.5 text-[13px] leading-[1.35] font-extrabold shadow-sm",
            notice.kind === "won" ? "bg-gold text-ink" : "bg-white text-ink",
          )}
        >
          {notice.kind === "won" ? (
            <Crown className="size-[18px] shrink-0 fill-current" strokeWidth={2} />
          ) : (
            <Crown className="size-[18px] shrink-0 text-danger" strokeWidth={2.4} />
          )}
          {notice.text}
        </li>
      ))}
    </ul>
  );
}

/** A big, friendly empty or error state with a character. */
export function GroupsMessage({ title, children, face = "happy" }: { title: string; children: ReactNode; face?: "happy" | "wow" | "joy" }) {
  return (
    <div className="flex flex-col items-center px-8 pt-6 text-center">
      <div className="relative">
        <div aria-hidden className="absolute top-[54%] left-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
        <div className="relative">
          <Personaje sp="zorro" size={120} acc={["bufanda"]} scarf="#E2504C" face={face} anim="float" />
        </div>
      </div>
      <h2 className="mt-5 font-display text-[26px] leading-[1.1] font-extrabold tracking-[-.02em]">{title}</h2>
      <div className="mt-2 text-[15px] leading-[1.45] font-semibold text-pretty text-ink-700">{children}</div>
    </div>
  );
}
