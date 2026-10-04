"use client";

import { ArrowDown, ArrowUp, Check, Hourglass, X } from "lucide-react";
import { TimerRing } from "@/components/games/FiveQuestionsPlay";
import { GameHeader } from "@/components/games/chrome";
import { Personaje } from "@/components/personaje/Personaje";
import { badgeLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { formatNumber } from "@/lib/format";
import { gameStyle, GAMES } from "@/lib/games";
import { namesList, ordinal } from "@/lib/largada";
import { AnsweredStrip, WaitingPill, type BattleFace } from "./parts";

/*
 * Cinco Preguntas a la par: the same question for everyone at once. The
 * right answer shows when everybody answered or the time ran out, with
 * the table: nobody can shout it to the others before.
 */

export interface BattleQuestionView {
  index: number;
  total: number;
  prompt: string;
  category: string;
  options: readonly string[];
}

export interface RevealRow {
  face: BattleFace;
  place: number;
  total: number;
  points: number;
  answered: boolean;
  correct: boolean;
  seconds: number | null;
  /** Places gained (+) or lost (−) with this question. */
  move: number;
}

interface Props {
  question: BattleQuestionView;
  /** "loading": the question is on its way. */
  phase: "loading" | "answering" | "waiting" | "revealed";
  /** Mine, question by question, for the dots. */
  outcomes: readonly boolean[];
  secondsLeft: number;
  fraction: number;
  faces: readonly BattleFace[];
  answered: ReadonlySet<string>;
  choice: number | null;
  me: { place: number; score: number; article: "el" | "la" };
  reveal?: { correctText: string; rows: readonly RevealRow[]; nextIn: number };
  onChoose: (choice: number) => void;
  onExit: () => void;
}

function ResultChip({ row }: { row: RevealRow }) {
  if (!row.answered) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-extrabold text-ink-500">
        <Hourglass className="size-3" strokeWidth={3} />
        No respondió
      </span>
    );
  }
  return row.correct ? (
    <span className="flex items-center gap-1 rounded-full bg-[#DDF5F1] px-2 py-0.5 text-[11px] font-extrabold text-success tabular-nums">
      <Check className="size-3" strokeWidth={3.4} />+{row.points}
      {row.seconds !== null && <span className="font-bold text-success/80">· {String(row.seconds).replace(".", ",")} s</span>}
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-full bg-[#FBE3E2] px-2 py-0.5 text-[11px] font-extrabold text-danger">
      <X className="size-3" strokeWidth={3.4} />
      No era
    </span>
  );
}

function Move({ move, light }: { move: number; light: boolean }) {
  if (move > 0) return <ArrowUp className={cx("size-3.5 shrink-0", light ? "text-white" : "text-success")} strokeWidth={3} aria-label="Subió" />;
  if (move < 0) return <ArrowDown className={cx("size-3.5 shrink-0", light ? "text-white" : "text-danger")} strokeWidth={3} aria-label="Bajó" />;
  return <span className="w-3.5 shrink-0" />;
}

export function BattleQuestion({ question, phase, outcomes, secondsLeft, fraction, faces, answered, choice, me, reveal, onChoose, onExit }: Props) {
  const game = GAMES["five-questions"];
  const shortOptions = question.options.every((option) => option.length <= 4);
  const revealed = phase === "revealed" && reveal;
  const missing = faces.filter((face) => !answered.has(face.key) && !face.isMe).map((face) => face.name);

  return (
    <Screen clouds={["-left-[70px] bottom-[60px] w-[220px] opacity-70"]} style={gameStyle(game)}>
      <GameHeader
        title={`Pregunta ${question.index + 1} de ${question.total}`}
        onClose={onExit}
        right={revealed ? undefined : <TimerRing fraction={fraction} seconds={secondsLeft} />}
      />

      <div className="flex justify-center gap-2 px-5 pt-4" aria-hidden>
        {Array.from({ length: question.total }, (_, i) => (
          <div
            key={i}
            className={cx("h-2 w-[30px] rounded-full", i < outcomes.length ? (outcomes[i] ? "bg-success" : "bg-danger") : i === question.index ? "bg-preguntas" : "bg-white")}
          />
        ))}
      </div>

      {revealed ? (
        <>
          <div className="mx-5 mt-4 rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(35,38,58,.08)]">
            <p className="font-display text-lg leading-[1.2] font-extrabold tracking-[-.01em] text-balance">{question.prompt}</p>
            <div className="mt-3 flex items-center gap-2 rounded-row bg-success px-3.5 py-2.5 text-white shadow-[0_10px_20px_rgba(31,160,147,.3)]">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-success">
                <Check className="size-3.5" strokeWidth={3.4} />
              </span>
              <span className="font-display text-[17px] leading-tight font-extrabold">{reveal.correctText}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between px-6 pt-4">
            <span className="text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">La tabla</span>
            <span className="text-xs font-bold text-ink-500">Después de {question.index + 1} de {question.total}</span>
          </div>
          <ol className="flex flex-col gap-2 px-4 pt-2">
            {reveal.rows.map((row) => (
              <li
                key={row.face.key}
                className={cx("flex h-[50px] items-center gap-2.5 rounded-row pr-3 pl-3 shadow-sm", row.face.isMe ? "bg-brand text-white" : "bg-white")}
              >
                <span className={cx("w-6 shrink-0 font-display text-sm font-extrabold tabular-nums", row.face.isMe ? "text-gold" : "text-ink-500")}>{row.place}</span>
                <span className="shrink-0">
                  <Personaje {...badgeLook(row.face.avatar)} size={32} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{row.face.isMe ? "Vos" : row.face.name}</span>
                </span>
                <span className={cx(row.face.isMe && "rounded-full bg-white/95")}>
                  <ResultChip row={row} />
                </span>
                <span className="w-12 shrink-0 text-right font-display text-[15px] font-extrabold tabular-nums">{formatNumber(row.total)}</span>
                <Move move={row.move} light={Boolean(row.face.isMe)} />
              </li>
            ))}
          </ol>
          <p className="mt-auto px-5 pt-4 text-center text-sm font-extrabold text-ink-700">
            {question.index + 1 < question.total ? `La próxima arranca en ${reveal.nextIn}…` : `El podio en ${reveal.nextIn}…`}
          </p>
        </>
      ) : (
        <>
          <AnsweredStrip faces={faces} answered={answered} />

          <div className="flex justify-between px-6 pt-3 text-xs font-bold text-ink-500">
            <span>
              Vas <b className="font-display text-[15px] font-extrabold text-ink">{ordinal(me.place, me.article)}</b> · {formatNumber(me.score)}
            </span>
            <span>{question.category}</span>
          </div>

          <div className="mx-5 mt-2.5 min-h-[104px] rounded-[24px] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(35,38,58,.08)]">
            <h1 className="font-display text-[22px] leading-[1.2] font-extrabold tracking-[-.02em] text-balance">{phase === "loading" ? "…" : question.prompt}</h1>
          </div>

          <div className="grid grid-cols-2 gap-2.5 px-5 pt-3">
            {(phase === "loading" ? ["", "", "", ""] : question.options).map((option, index) => {
              const mine = phase === "waiting" && index === choice;
              return (
                <button
                  key={`${question.index}-${index}`}
                  type="button"
                  onClick={() => onChoose(index)}
                  disabled={phase !== "answering"}
                  className={cx(
                    "relative flex h-[78px] items-center justify-center rounded-tile px-3 text-center font-display font-extrabold transition duration-150",
                    shortOptions ? "text-[30px]" : "text-[16px] leading-[1.15]",
                    mine
                      ? "bg-preguntas text-white shadow-[0_12px_24px_rgba(139,108,255,.35)]"
                      : cx("bg-white text-ink shadow-[0_8px_20px_rgba(35,38,58,.06)] active:scale-[.98]", phase === "waiting" && "opacity-50"),
                  )}
                >
                  {option}
                  {mine && <span className="absolute top-1.5 right-2 text-[10px] font-extrabold tracking-[.04em] text-white/90 uppercase">Tu respuesta</span>}
                </button>
              );
            })}
          </div>

          <div className="px-5 pt-4">
            {phase === "waiting" ? (
              <WaitingPill>
                {choice === null
                  ? "Se terminó el tiempo · ya sale la correcta"
                  : missing.length === 0
                    ? "¡Ya respondieron todos!"
                    : `Esperando a ${namesList(missing)}…`}
              </WaitingPill>
            ) : (
              <p className="text-center text-xs font-semibold text-ink-500">La correcta se ve cuando responden todos</p>
            )}
          </div>
        </>
      )}
    </Screen>
  );
}
