"use client";

import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";
import type { LettersFoundWord } from "@/lib/battle-types";
import type { BattleFace } from "./parts";

/*
 * Diez Letras on the podium: everyone's words, one player at a time (tap
 * to open). The ones only that player found have a star; a rude word
 * someone else found shows hidden.
 */

export interface LettersWordsRow {
  face: BattleFace;
  words: readonly LettersFoundWord[];
}

const count = (n: number) => (n === 1 ? "1 palabra" : `${n} palabras`);

export function BattleLettersWords({ rows }: { rows: readonly LettersWordsRow[] }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const anyOnly = rows.some((row) => row.words.some((one) => one.onlyOne));
  return (
    <section className="mx-5 mt-3 rounded-card bg-white px-3 py-2.5 shadow-md" aria-label="Las palabras de cada uno">
      <div className="flex items-baseline justify-between px-1 pt-0.5">
        <span className="text-[11px] font-extrabold tracking-[.06em] text-ink-500 uppercase">Las palabras de cada uno</span>
        <span className="text-[11px] font-bold text-ink-500">Tocá para verlas</span>
      </div>
      <ul className="mt-1.5 flex flex-col">
        {rows.map(({ face, words }) => {
          const shown = open.has(face.key);
          return (
            <li key={face.key} className="border-t border-line first:border-t-0">
              <button
                type="button"
                onClick={() => toggle(face.key)}
                aria-expanded={shown}
                disabled={words.length === 0}
                className="flex w-full items-center gap-2.5 py-2 text-left disabled:cursor-default"
              >
                <span className="shrink-0">
                  <Personaje {...avatarLook(face.avatar)} size={26} />
                </span>
                <span className={cx("min-w-0 flex-1 truncate text-sm font-extrabold", face.isMe && "text-brand")}>{face.isMe ? "Vos" : face.name}</span>
                <span className="shrink-0 text-xs font-bold text-ink-500">{count(words.length)}</span>
                {words.length > 0 && <ChevronDown className={cx("size-4 shrink-0 text-ink-300 transition-transform", shown && "rotate-180")} strokeWidth={2.8} />}
              </button>
              {shown && (
                <ul className="flex flex-wrap gap-1.5 pb-2.5">
                  {words.map((one, i) => (
                    <li
                      key={one.word ?? `hidden-${i}`}
                      className={cx(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold",
                        one.onlyOne ? "bg-gold-soft text-ink" : "bg-surface-2 text-ink",
                      )}
                    >
                      {one.onlyOne && <Star className="size-3 fill-gold text-gold" strokeWidth={2.4} aria-label="Solo la encontró esta persona" />}
                      {one.word ?? <span aria-label="Palabra oculta">•••••</span>}
                      <span className="font-semibold text-ink-500">+{one.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {anyOnly && (
        <p className="flex items-center gap-1 px-1 pt-0.5 pb-0.5 text-[11px] font-semibold text-ink-500">
          <Star className="size-3 fill-gold text-gold" strokeWidth={2.4} aria-hidden />
          La encontró uno solo
        </p>
      )}
    </section>
  );
}
