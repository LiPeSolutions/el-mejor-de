"use client";

import { SEQUENCE_RULES } from "@repo/games";
import { Check, ChevronRight, Gamepad2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import type { ChallengeResult } from "@/lib/challenge-types";
import { formatNumber } from "@/lib/format";
import { gameStyle, type GameTheme } from "@/lib/games";
import { playSound, playSoundLater } from "@/lib/sound";

interface DailyProps {
  practice: false;
  position: number;
  next: { href: string; label: string; note: string };
}

interface PracticeProps {
  practice: true;
  isRecord: boolean;
  previous: number | null;
  againHref: string;
}

type Props = { game: GameTheme; result: ChallengeResult } & (DailyProps | PracticeProps);

const CLOUDS = [
  "-left-[70px] top-[120px] w-[200px] opacity-95",
  "-right-[60px] top-[260px] w-[170px] opacity-95",
  "-left-[40px] bottom-[120px] w-[220px] opacity-95",
];

function praiseFor(game: GameTheme, score: number): string {
  if (score >= 700) return game.praise;
  if (score >= 400) return "¡Bien!";
  return "¡Mañana sale mejor!";
}

function Card({ children }: { children: ReactNode }) {
  return <div className="mx-5 mt-[18px] flex flex-col gap-2.5 rounded-card bg-white px-4 py-3.5 shadow-md">{children}</div>;
}

const Divider = () => <div className="h-px bg-line" />;

function LetterTiles({ word, gold }: { word: string; gold?: boolean }) {
  return (
    <div className="flex gap-1">
      {[...word].map((letter, i) => (
        <div
          key={i}
          className={cx(
            "grid h-11 max-w-[38px] min-w-0 flex-1 place-items-center rounded-[10px] font-display font-extrabold",
            word.length > 8 ? "text-lg" : "text-xl",
            gold ? "bg-gold text-ink" : "bg-letras text-white",
          )}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

function Detail({ result }: { result: ChallengeResult }) {
  switch (result.game) {
    case "seven-letters": {
      const fullWord = result.fullWords[0];
      // Ten letters since 4/10/2026; earlier results had seven.
      const fullLength = fullWord?.length ?? 10;
      const shown = result.words.slice(0, 8);
      return (
        <Card>
          <div className="flex justify-between text-sm font-bold">
            <span>{result.words.length === 1 ? "1 palabra" : `${result.words.length} palabras`}</span>
            {result.longest && <span className="font-semibold text-ink-500">la más larga: {result.longest}</span>}
          </div>
          {shown.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {shown.map((entry) => (
                <li
                  key={entry.word}
                  className={cx(
                    "flex items-baseline gap-[5px] rounded-full px-2.5 py-1.5 text-xs font-extrabold",
                    entry.word.length === fullLength ? "bg-gold-soft" : "bg-surface-2",
                  )}
                >
                  {entry.word}
                  <span className={entry.word.length === fullLength ? "font-bold text-gold-text" : "font-semibold text-ink-500"}>+{entry.delta}</span>
                </li>
              ))}
              {result.words.length > shown.length && (
                <li className="rounded-full bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink-500">+{result.words.length - shown.length} más</li>
              )}
            </ul>
          )}
          {fullWord && (
            <>
              <Divider />
              <div className="text-[13px] font-semibold text-ink-500">
                {result.foundFullWord ? `¡Sacaste la de ${fullLength} letras!` : `Te faltó la de ${fullLength} letras:`}
              </div>
              <LetterTiles word={fullWord} gold={result.foundFullWord} />
            </>
          )}
        </Card>
      );
    }
    case "five-questions":
      return (
        <Card>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">Correctas</span>
            <span className="font-display text-[22px] font-extrabold">{result.correctCount} de {result.questions.length}</span>
          </div>
          <Divider />
          <div className="flex justify-between gap-1.5">
            {result.questions.map((question, i) => (
              <div
                key={i}
                className={cx(
                  "flex h-9 flex-1 items-center justify-center gap-1 rounded-xl font-display text-xs font-extrabold tabular-nums",
                  question.correct ? "bg-preguntas text-white" : "bg-sky-300 text-ink-500",
                )}
              >
                {question.correct ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                {question.seconds !== null && `${question.seconds} s`}
              </div>
            ))}
          </div>
          <div className="text-center text-[11px] font-semibold text-ink-500">segundos por respuesta · las correctas en color</div>
        </Card>
      );
    case "reflexes": {
      const hits = result.rounds.flatMap((round) => (round.reactionMs !== null && round.outcome === "hit" ? [round.reactionMs] : []));
      const best = hits.length > 0 ? Math.min(...hits) : null;
      return (
        <Card>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">Promedio</span>
            <span className="font-display text-[22px] font-extrabold">{result.averageMs === null ? "—" : `${result.averageMs} ms`}</span>
          </div>
          <Divider />
          <div className="flex justify-between gap-1.5">
            {result.rounds.map((round, i) => (
              <div
                key={i}
                className={cx(
                  "flex h-9 flex-1 items-center justify-center rounded-xl font-display text-xs font-extrabold tabular-nums",
                  round.reactionMs !== null && round.reactionMs === best ? "bg-reflejos text-white" : "bg-sky-300",
                )}
              >
                {round.outcome === "hit" ? round.reactionMs : "✗"}
              </div>
            ))}
          </div>
          <div className="text-center text-[11px] font-semibold text-ink-500">milisegundos por ronda · la mejor en color</div>
        </Card>
      );
    }
    case "sequence": {
      const target = SEQUENCE_RULES.targetLevel;
      const missing = Math.max(0, target - result.levelReached);
      return (
        <Card>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">
              {result.levelReached === 1 ? "Superaste 1 nivel" : `Superaste ${result.levelReached} niveles`}
            </span>
            <span className="text-[13px] font-bold text-ink-500">el {target} da 1.000</span>
          </div>
          <Divider />
          <div className="flex gap-[5px]">
            {Array.from({ length: target }, (_, i) => (
              <div
                key={i}
                className={cx("h-[30px] flex-1 rounded-[9px]", i < result.levelReached ? "bg-gold" : "border-2 border-dashed border-ink-300")}
              />
            ))}
          </div>
          <div className="text-center text-[11px] font-semibold text-ink-500">
            {missing === 0 ? "¡llegaste al máximo!" : `niveles superados · te ${missing === 1 ? "faltó uno" : `faltaron ${missing}`}`}
          </div>
        </Card>
      );
    }
  }
}

/** The score lands with its sound; a new practice record gets its little tune after it. */
export function useResultSound(score: number, record: boolean): void {
  const sounded = useRef(false);
  useEffect(() => {
    if (sounded.current) return;
    sounded.current = true;
    playSound("reveal", score);
    if (record) playSoundLater(1300, "record");
  }, [score, record]);
}

export function GameResultView(props: Props) {
  const { game, result } = props;
  useResultSound(result.score, props.practice && props.isRecord);
  return (
    <Screen clouds={CLOUDS} style={gameStyle(game)}>
      <div className="flex justify-center px-5">
        <Chip className="whitespace-nowrap">
          {props.practice ? (
            <>
              <Gamepad2 className="size-4" strokeWidth={2.4} />
              Práctica · {game.name}
            </>
          ) : (
            <>
              <span className="inline-block size-2 rounded-full bg-(--game)" />
              Reto {props.position} de 3 · {game.name}
            </>
          )}
        </Chip>
      </div>
      <div className="mt-4 flex justify-center">
        <Personaje {...game.mascot} face={game.resultFace} size={84} />
      </div>
      <div className="mt-1.5 text-center">
        {props.practice && props.isRecord ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-[7px] text-[13px] font-extrabold shadow-[0_8px_18px_rgba(255,197,61,.4)]">
            <Sparkles className="size-4" strokeWidth={2.4} />
            ¡Nuevo récord personal!
          </div>
        ) : (
          <div className="text-sm font-bold text-ink-500">{praiseFor(game, result.score)}</div>
        )}
        {result.game === "sequence" && (
          <div className="mt-2 font-display text-[30px] leading-none font-extrabold tracking-[-.03em]">
            {result.levelReached === 0 ? "No pasaste el nivel 1" : `Llegaste al nivel ${result.levelReached}`}
          </div>
        )}
        <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
          <div className="font-display text-[84px] leading-none font-extrabold tracking-[-.05em] tabular-nums">
            <AnimatedNumber value={result.score} />
          </div>
          <div className="font-display text-lg font-bold text-ink-500">/ 1.000</div>
        </div>
        {props.practice ? (
          props.previous !== null && <div className="mt-1.5 text-sm font-bold text-ink-500">Tu récord anterior: {formatNumber(props.previous)}</div>
        ) : (
          <ProgressBar value={result.score} />
        )}
      </div>

      <Detail result={result} />

      <div className="mt-auto px-5 pt-3.5">
        {props.practice ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="game" size="lg" href={props.againHref} shine={false}>
                <RotateCcw className="size-[18px]" strokeWidth={2.6} />
                Otra vez
              </Button>
              <Button variant="secondary" size="lg" href="/practicar">
                Volver
              </Button>
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-ink-700">Quedó en tus récords personales</p>
          </>
        ) : (
          <>
            <Button href={props.next.href}>
              {props.next.label}
              <ChevronRight className="size-5" strokeWidth={2.8} />
            </Button>
            <p className="mt-2 text-center text-xs font-semibold text-ink-700">{props.next.note}</p>
          </>
        )}
      </div>
    </Screen>
  );
}
