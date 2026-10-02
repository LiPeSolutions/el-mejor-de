"use client";

import { Check, Hourglass, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import type { AnswerResponse, QuestionResponse, StartView } from "@/lib/challenge-types";
import { formatNumber } from "@/lib/format";
import { FloatingToast, GameHeader, useToast } from "./chrome";

type View = Extract<StartView, { game: "five-questions" }>;
export interface FiveQuestionsClientLog {
  receipts: string[];
}

interface Props {
  view: View;
  token: string;
  onProgress: (log: FiveQuestionsClientLog) => void;
  onFinish: (log: FiveQuestionsClientLog) => void;
  onExit: () => void;
}

type Phase = "loading" | "answering" | "revealed";

/** Seconds-left ring (44 px). */
function TimerRing({ fraction, seconds }: { fraction: number; seconds: number }) {
  const radius = 19;
  const length = 2 * Math.PI * radius;
  return (
    <div className="relative size-11" aria-label={`Quedan ${seconds} segundos`}>
      <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#E8EAF6" strokeWidth="5" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#8B6CFF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-[15px] font-extrabold tabular-nums">{seconds}</div>
    </div>
  );
}

export function FiveQuestionsPlay({ view, token, onProgress, onFinish, onExit }: Props) {
  const limitMs = view.secondsPerQuestion * 1000;
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [chosen, setChosen] = useState<number | null>(null);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [score, setScore] = useState(0);
  const [outcomes, setOutcomes] = useState<boolean[]>([]);
  const [left, setLeft] = useState(limitMs);
  const [toast, showToast] = useToast();
  const receipts = useRef<string[]>([]);
  const shownAt = useRef(0);
  const finished = useRef(false);
  const locked = useRef(false);

  const end = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ receipts: receipts.current });
  };

  // The server reveals one question at a time; its clock starts when it's sent.
  const fetchQuestion = (next: number) =>
    api.question(token, next).then(
      (response) => {
        setQuestion(response);
        setIndex(next);
        shownAt.current = performance.now();
        locked.current = false;
        setLeft(limitMs);
        setPhase("answering");
      },
      () => end(),
    );

  const load = (next: number) => {
    setPhase("loading");
    setChosen(null);
    setAnswer(null);
    void fetchQuestion(next);
  };

  const loadFirst = useEffectEvent(() => void fetchQuestion(0));
  useEffect(() => {
    loadFirst();
  }, []);

  const submit = async (choice: number | null) => {
    if (!question || phase !== "answering" || locked.current) return;
    locked.current = true;
    setPhase("revealed");
    setChosen(choice);
    try {
      const response = await api.answer(token, question.questionToken, choice);
      receipts.current = [...receipts.current, response.receipt];
      onProgress({ receipts: receipts.current });
      setAnswer(response);
      setScore((current) => current + response.points);
      setOutcomes((current) => [...current, response.correct]);
      const right = question.options[response.correctChoice];
      if (response.correct) {
        showToast({ tone: "success", icon: <Check className="size-3.5" strokeWidth={3} />, text: `¡Correcta! +${response.points} · respondiste en ${response.seconds} s` });
      } else if (choice === null) {
        showToast({ tone: "danger", icon: <Hourglass className="size-3.5" strokeWidth={3} />, text: `Se terminó el tiempo · era ${right}` });
      } else {
        showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: `No era · la correcta: ${right}` });
      }
    } catch {
      setOutcomes((current) => [...current, false]);
    }
    window.setTimeout(() => {
      if (finished.current) return;
      if (question.index + 1 < view.questionCount) load(question.index + 1);
      else end();
    }, 1300);
  };

  const onTick = useEffectEvent(() => {
    const remaining = limitMs - (performance.now() - shownAt.current);
    setLeft(remaining);
    if (remaining <= 0) void submit(null);
  });

  useEffect(() => {
    if (phase !== "answering") return;
    const id = window.setInterval(() => onTick(), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const shortOptions = question?.options.every((option) => option.length <= 4) ?? true;
  const seconds = Math.max(0, Math.ceil(left / 1000));

  return (
    <Screen clouds={["-left-[70px] bottom-[60px] w-[220px] opacity-70"]}>
      <GameHeader
        title={`Pregunta ${index + 1} de ${view.questionCount}`}
        onClose={onExit}
        right={
          // Frozen at the moment of answering; full while the next question loads.
          <TimerRing
            fraction={phase === "loading" ? 1 : Math.max(0, left / limitMs)}
            seconds={phase === "loading" ? view.secondsPerQuestion : seconds}
          />
        }
      />

      <div className="flex justify-center gap-2 px-5 pt-4" aria-hidden>
        {Array.from({ length: view.questionCount }, (_, i) => (
          <div
            key={i}
            className={cx(
              "h-2 w-[30px] rounded-full",
              i < outcomes.length ? (outcomes[i] ? "bg-success" : "bg-danger") : i === index ? "bg-preguntas" : "bg-white",
            )}
          />
        ))}
      </div>

      <div className="flex justify-between px-6 pt-3 text-xs font-bold text-ink-500">
        <span>
          Puntaje <b className="font-display text-[15px] font-extrabold text-ink">{formatNumber(score)}</b>
        </span>
        <span>{question?.category}</span>
      </div>

      <div className="mx-5 mt-3 min-h-[118px] rounded-[24px] bg-white px-5 py-[22px] shadow-[0_10px_24px_rgba(35,38,58,.08)]">
        <h1 className="font-display text-2xl leading-[1.2] font-extrabold tracking-[-.02em] text-balance">
          {question?.prompt ?? "…"}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-3.5">
        {(question?.options ?? ["", "", "", ""]).map((option, choice) => {
          const revealed = phase === "revealed" && answer;
          const isCorrect = revealed && choice === answer.correctChoice;
          const isWrongPick = revealed && choice === chosen && !answer.correct;
          return (
            <button
              key={`${question?.index ?? -1}-${choice}`}
              type="button"
              onClick={() => void submit(choice)}
              disabled={phase !== "answering"}
              className={cx(
                "relative flex h-[84px] items-center justify-center rounded-tile px-3 text-center font-display font-extrabold transition duration-150",
                shortOptions ? "text-[34px]" : "text-[17px] leading-[1.15]",
                isCorrect
                  ? "bg-success text-white shadow-[0_12px_24px_rgba(31,160,147,.35)]"
                  : isWrongPick
                    ? "bg-danger text-white shadow-[0_12px_24px_rgba(226,80,76,.3)]"
                    : cx("bg-white text-ink shadow-[0_8px_20px_rgba(35,38,58,.06)] active:scale-[.98]", revealed && "opacity-60"),
              )}
            >
              {option}
              {(isCorrect || isWrongPick) && (
                <span className={cx("absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-white", isCorrect ? "text-success" : "text-danger")}>
                  {isCorrect ? <Check className="size-3.5" strokeWidth={3.4} /> : <X className="size-3.5" strokeWidth={3.4} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative flex h-14 justify-center px-5 pt-4">
        <FloatingToast toast={toast} className="top-4" />
      </div>

      <p className="mt-auto px-5 text-center text-xs font-semibold text-ink-500">La siguiente arranca sola en un segundo</p>
    </Screen>
  );
}
