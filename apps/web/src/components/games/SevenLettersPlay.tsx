"use client";

import { sevenLettersScore, sevenLettersWordPoints, type SevenLettersLog } from "@repo/games";
import { Check, Clock, Delete, RotateCcw, Send, Shuffle, WifiOff, X } from "lucide-react";
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
  const [found, setFound] = useState<Array<{ word: string; delta: number }>>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(view.durationMs);
  const [checking, setChecking] = useState(false);
  const [toast, showToast] = useToast();
  const pointsRef = useRef(0);
  const scoreRef = useRef(0);
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
    if (checking || selected.includes(id)) return;
    setSelected((current) => [...current, id]);
  };
  const erase = () => setSelected((current) => current.slice(0, -1));
  const mix = () => {
    setSelected([]);
    setTiles((current) => shuffled(current));
  };

  const send = async () => {
    if (checking || finishedRef.current || word.length === 0) return;
    if (word.length < view.minWordLength) {
      showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: `Tiene que tener ${view.minWordLength} letras o más` });
      return;
    }
    if (found.some((entry) => entry.word === word)) {
      showToast({ tone: "gold", icon: <RotateCcw className="size-3.5" strokeWidth={3} />, text: `${word} ya la tenés` });
      setSelected([]);
      return;
    }
    const entry = { word, atMs: Math.round(performance.now() - startRef.current) };
    submissions.current = [...submissions.current, entry];
    onProgress({ submissions: submissions.current });
    setChecking(true);
    try {
      const response = await api.checkWord(token, word);
      if (response.status === "valid") {
        pointsRef.current += sevenLettersWordPoints(response.word);
        const next = sevenLettersScore(pointsRef.current, view.targetPoints);
        const delta = next - scoreRef.current;
        scoreRef.current = next;
        setScore(next);
        setFound((current) => [...current, { word: response.word, delta }]);
        showToast({ tone: "success", icon: <Check className="size-3.5" strokeWidth={3} />, text: `¡${response.word}! +${delta}` });
      } else {
        showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: `${word} no está en el diccionario` });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) {
        finish();
      } else {
        // Not checked, so let the player send it again.
        submissions.current = submissions.current.filter((item) => item !== entry);
        showToast({ tone: "danger", icon: <WifiOff className="size-3.5" strokeWidth={3} />, text: "Sin conexión: probá de nuevo" });
      }
    } finally {
      setChecking(false);
      setSelected([]);
    }
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
      <ScoreRow score={score} label="Palabras" value={found.length} />

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
          disabled={checking}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-letras font-display text-[15px] font-extrabold text-white shadow-[0_10px_20px_rgba(255,107,74,.35)] active:scale-[.98] disabled:opacity-70"
        >
          <Send className="size-4" strokeWidth={2.4} />
          Enviar
        </button>
      </div>

      <div className="px-5 pt-[18px]">
        <Label className="mb-2">Encontradas</Label>
        <ul className="flex flex-wrap gap-1.5">
          {found.map((entry) => (
            <li key={entry.word} className="flex items-baseline gap-[5px] rounded-full bg-white px-2.5 py-1.5 text-xs font-extrabold">
              {entry.word}
              <span className="font-semibold text-ink-500">+{entry.delta}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-auto px-5 pt-4 text-center text-xs font-semibold text-ink-500">La de 7 letras tiene premio</p>
    </Screen>
  );
}
