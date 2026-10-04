"use client";

import { sevenLettersScore, type SevenLettersLog } from "@repo/games";
import { Clock, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Label } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { ApiError, api } from "@/lib/api";
import type { StartView } from "@/lib/challenge-types";
import { formatClock } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { playSound } from "@/lib/sound";
import { GameHeader, ScoreRow, useToast } from "./chrome";
import { LetterKeys, WordChip, useLetterKeys, useTyping, type SentWord } from "./letters";

type View = Extract<StartView, { game: "seven-letters" }>;

interface Props {
  view: View;
  token: string;
  onProgress: (log: SevenLettersLog) => void;
  onFinish: (log: SevenLettersLog) => void;
  onExit: () => void;
}

/** Network hiccups get a few more tries; after that the final grading decides. */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

export function SevenLettersPlay({ view, token, onProgress, onFinish, onExit }: Props) {
  const startRef = useRef(0);
  const letterCount = view.letters.length;
  // Days before 4/10/2026 had seven letters, in one row.
  const twoRows = letterCount > 7;
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
  const lastTick = useRef(0);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({ submissions: submissions.current });
  };

  const onTick = useEffectEvent(() => {
    const remaining = view.durationMs - (performance.now() - startRef.current);
    setLeft(remaining);
    // The clock ticks in the last 10 seconds.
    const seconds = Math.ceil(remaining / 1000);
    if (remaining > 0 && seconds <= 10 && seconds !== lastTick.current) {
      lastTick.current = seconds;
      playSound("tick", seconds % 2 === 0);
    }
    if (remaining <= 0) {
      if (!finishedRef.current) playSound("timeUp");
      finish();
    }
  });

  useEffect(() => {
    startRef.current = performance.now();
    const id = window.setInterval(() => onTick(), 200);
    return () => window.clearInterval(id);
  }, []);

  const keys = useLetterKeys(view.letters);
  const word = keys.word;

  const mark = (word: string, change: Partial<SentWord>) =>
    setSent((current) => current.map((entry) => (entry.word === word ? { ...entry, ...change } : entry)));

  /** Asks the server whether the word is valid, while the player keeps going. */
  const check = async (word: string, attempt = 0): Promise<void> => {
    try {
      const response = await api.checkWord(token, word);
      if (response.status !== "valid") {
        playSound("error");
        return mark(word, { status: "invalid" });
      }
      pointsRef.current += response.points;
      const next = sevenLettersScore(pointsRef.current, view.targetPoints);
      const delta = next - scoreRef.current;
      scoreRef.current = next;
      setScore(next);
      mark(word, { status: "valid", delta });
      if (response.word.length === letterCount) playSound("jackpot");
      else playSound("word", response.word.length);
      if (response.word.length === letterCount) {
        showToast({ tone: "success", icon: <Sparkles className="size-3.5" strokeWidth={2.6} />, text: `¡${response.word}! La de ${letterCount} letras +${delta}` });
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
      playSound("nope");
      showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: `Tiene que tener ${view.minWordLength} letras o más` });
      return;
    }
    keys.clear();
    if (sentWords.current.has(word)) {
      playSound("nope");
      showToast({ tone: "gold", icon: <RotateCcw className="size-3.5" strokeWidth={3} />, text: `${word} ya la mandaste` });
      return;
    }
    sentWords.current.add(word);
    submissions.current = [...submissions.current, { word, atMs: Math.round(performance.now() - startRef.current) }];
    onProgress({ submissions: submissions.current });
    setSent((current) => [{ word, status: "checking" }, ...current]);
    void check(word);
  };
  useTyping(keys, send);

  const urgent = left <= 10_000;

  return (
    <Screen clouds={["-right-[60px] bottom-10 w-[220px] opacity-70"]}>
      <GameHeader
        title={twoRows ? GAMES["seven-letters"].name : "Siete Letras"}
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

      <LetterKeys keys={keys} toast={toast} onSend={send} />

      <div className="px-5 pt-[18px]">
        <Label className="mb-2">Tus palabras</Label>
        <ul className="flex flex-wrap gap-1.5">
          {sent.map((entry) => (
            <WordChip key={entry.word} entry={entry} />
          ))}
        </ul>
      </div>

      <p className="mt-auto px-5 pt-4 text-center text-xs font-semibold text-ink-500">La de {letterCount} letras tiene premio</p>
    </Screen>
  );
}
