"use client";

import { sevenLettersScore, sevenLettersWordPoints, type SevenLettersLog } from "@repo/games";
import { Clock, Delete, RotateCcw, Send, Shuffle, Sparkles, WifiOff, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Label } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { ApiError, api } from "@/lib/api";
import type { StartView } from "@/lib/challenge-types";
import { formatClock } from "@/lib/format";
import { FloatingToast, GameHeader, ScoreRow, useToast } from "./chrome";

type View = Extract<StartView, { game: "seven-letters" }>;

interface Props {
  view: View;
  token: string;
  onProgress: (log: SevenLettersLog) => void;
  onFinish: (log: SevenLettersLog) => void;
  onExit: () => void;
}

/** A sent word: it shows up at once, and the server's answer marks it later. */
interface SentWord {
  word: string;
  status: "checking" | "valid" | "invalid" | "unverified";
  /** Points it added to the score, once it's valid. */
  delta?: number;
}

/** Network hiccups get a few more tries; after that the final grading decides. */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export function SevenLettersPlay({ view, token, onProgress, onFinish, onExit }: Props) {
  const startRef = useRef(0);
  const [tiles, setTiles] = useState(() => view.letters.map((letter, id) => ({ id, letter })));
  const [selected, setSelected] = useState<number[]>([]);
  // Newest first, so the last word sent is always in sight.
  const [sent, setSent] = useState<SentWord[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(view.durationMs);
  const [toast, showToast] = useToast();
  const pointsRef = useRef(0);
  const scoreRef = useRef(0);
  const sentWords = useRef(new Set<string>());
  const submissions = useRef<SevenLettersLog["submissions"]>([]);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({ submissions: submissions.current });
  };

  const onTick = useEffectEvent(() => {
    const remaining = view.durationMs - (performance.now() - startRef.current);
    setLeft(remaining);
    if (remaining <= 0) finish();
  });

  useEffect(() => {
    startRef.current = performance.now();
    const id = window.setInterval(() => onTick(), 200);
    return () => window.clearInterval(id);
  }, []);

  const word = selected.map((id) => tiles.find((tile) => tile.id === id)?.letter ?? "").join("");

  const tap = (id: number) => {
    if (selected.includes(id)) return;
    setSelected((current) => [...current, id]);
  };
  const erase = () => setSelected((current) => current.slice(0, -1));
  const mix = () => {
    setSelected([]);
    setTiles((current) => shuffled(current));
  };

  const mark = (word: string, change: Partial<SentWord>) =>
    setSent((current) => current.map((entry) => (entry.word === word ? { ...entry, ...change } : entry)));

  /** Asks the server whether the word is valid, while the player keeps going. */
  const check = async (word: string, attempt = 0): Promise<void> => {
    try {
      const response = await api.checkWord(token, word);
      if (response.status !== "valid") return mark(word, { status: "invalid" });
      pointsRef.current += sevenLettersWordPoints(response.word);
      const next = sevenLettersScore(pointsRef.current, view.targetPoints);
      const delta = next - scoreRef.current;
      scoreRef.current = next;
      setScore(next);
      mark(word, { status: "valid", delta });
      if (response.word.length === view.letters.length) {
        showToast({ tone: "success", icon: <Sparkles className="size-3.5" strokeWidth={2.6} />, text: `¡${response.word}! La de 7 letras +${delta}` });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) return finish();
      const retryable = !(error instanceof ApiError) || error.status >= 500;
      const delay = RETRY_DELAYS_MS[attempt];
      if (!retryable || delay === undefined || finishedRef.current) return mark(word, { status: "unverified" });
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      return check(word, attempt + 1);
    }
  };

  const send = () => {
    if (finishedRef.current || word.length === 0) return;
    if (word.length < view.minWordLength) {
      showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: `Tiene que tener ${view.minWordLength} letras o más` });
      return;
    }
    setSelected([]);
    if (sentWords.current.has(word)) {
      showToast({ tone: "gold", icon: <RotateCcw className="size-3.5" strokeWidth={3} />, text: `${word} ya la mandaste` });
      return;
    }
    sentWords.current.add(word);
    submissions.current = [...submissions.current, { word, atMs: Math.round(performance.now() - startRef.current) }];
    onProgress({ submissions: submissions.current });
    setSent((current) => [{ word, status: "checking" }, ...current]);
    void check(word);
  };

  // Physical keyboard: letters, Backspace and Enter.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Enter") return void send();
    if (event.key === "Backspace") return erase();
    const letter = event.key.toLocaleUpperCase("es");
    if (!/^[A-ZÑ]$/.test(letter)) return;
    const free = tiles.find((tile) => tile.letter === letter && !selected.includes(tile.id));
    if (free) tap(free.id);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const urgent = left <= 10_000;

  return (
    <Screen clouds={["-right-[60px] bottom-10 w-[220px] opacity-70"]}>
      <GameHeader
        title="Siete Letras"
        onClose={onExit}
        right={
          <div
            className={cx(
              "flex h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 font-display text-base font-extrabold tabular-nums shadow-[0_6px_16px_rgba(35,38,58,.08)]",
              urgent && "text-danger",
            )}
            aria-label={`Quedan ${Math.max(0, Math.ceil(left / 1000))} segundos`}
          >
            <Clock className="size-4" strokeWidth={2.6} />
            {formatClock(left)}
          </div>
        }
      />
      <ScoreRow score={score} label="Palabras" value={sent.filter((entry) => entry.status === "valid").length} />

      <div className="relative mx-5 mt-4">
        <FloatingToast toast={toast} className="-top-3.5" />
        <div
          aria-live="polite"
          className="flex h-[72px] items-center justify-center gap-1 rounded-tile bg-white font-display text-[30px] font-extrabold tracking-[.08em] shadow-md"
        >
          {word}
          <span aria-hidden className="ml-1 inline-block h-[34px] w-[3px] animate-pulse rounded-sm bg-letras" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 px-5 pt-4">
        {tiles.map((tile) => {
          const used = selected.includes(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => tap(tile.id)}
              disabled={used}
              aria-label={`Letra ${tile.letter}`}
              className={cx(
                "grid h-14 place-items-center rounded-key font-display text-2xl font-extrabold transition duration-150 active:scale-95",
                used
                  ? "bg-white text-ink-300 shadow-[inset_0_0_0_2px_#D9DDF3]"
                  : "bg-letras text-white shadow-[0_8px_16px_rgba(255,107,74,.3)]",
              )}
            >
              {tile.letter}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2 px-5 pt-3">
        <button type="button" onClick={erase} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-bold shadow-sm active:scale-[.98]">
          <Delete className="size-4" strokeWidth={2.4} />
          Borrar
        </button>
        <button type="button" onClick={mix} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-bold shadow-sm active:scale-[.98]">
          <Shuffle className="size-4" strokeWidth={2.4} />
          Mezclar
        </button>
        <button
          type="button"
          onClick={send}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-letras font-display text-[15px] font-extrabold text-white shadow-[0_10px_20px_rgba(255,107,74,.35)] active:scale-[.98]"
        >
          <Send className="size-4" strokeWidth={2.4} />
          Enviar
        </button>
      </div>

      <div className="px-5 pt-[18px]">
        <Label className="mb-2">Tus palabras</Label>
        <ul className="flex flex-wrap gap-1.5">
          {sent.map((entry) => (
            <WordChip key={entry.word} entry={entry} />
          ))}
        </ul>
      </div>

      <p className="mt-auto px-5 pt-4 text-center text-xs font-semibold text-ink-500">La de 7 letras tiene premio</p>
    </Screen>
  );
}

const STATUS_LABELS: Record<SentWord["status"], string> = {
  checking: "verificando",
  valid: "vale",
  invalid: "no vale",
  unverified: "sin verificar todavía",
};

/** White chip: gray with dots while checking, "+N" when valid, a red circle when not. */
function WordChip({ entry }: { entry: SentWord }) {
  const { word, status, delta } = entry;
  return (
    <li
      aria-label={status === "valid" ? `${word}: +${delta}` : `${word}: ${STATUS_LABELS[status]}`}
      className="flex items-center gap-[5px] rounded-full bg-white px-2.5 py-1.5 text-xs font-extrabold"
    >
      {status === "invalid" && (
        <span aria-hidden className="grid size-3.5 place-items-center rounded-full bg-danger text-white">
          <X className="size-2.5" strokeWidth={4} />
        </span>
      )}
      <span className={cx(status !== "valid" && "text-ink-500")}>{word}</span>
      {status === "valid" && <span className="font-semibold text-ink-500">+{delta}</span>}
      {status === "checking" && (
        <span aria-hidden className="flex gap-0.5">
          {[0, 150, 300].map((delayMs) => (
            <span key={delayMs} className="size-1 animate-pulse rounded-full bg-ink-300" style={{ animationDelay: `${delayMs}ms` }} />
          ))}
        </span>
      )}
      {status === "unverified" && <WifiOff aria-hidden className="size-3 text-ink-300" strokeWidth={2.6} />}
    </li>
  );
}
