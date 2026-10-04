"use client";

import { Delete, Send, Shuffle, WifiOff, X } from "lucide-react";
import { useEffect, useEffectEvent, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { playSound } from "@/lib/sound";
import { FloatingToast, type ToastState } from "./chrome";

/*
 * The letters game's keyboard, shared by the daily challenge and the live
 * battles: the word being built, the letters and Borrar · Mezclar ·
 * Enviar, plus the chips of the words sent. Each screen decides what
 * sending a word does.
 */

/**
 * A button that acts as soon as the finger touches it, not when it lifts:
 * fast typing doesn't lose taps. The keyboard (Enter or Space) still works.
 */
export function PressButton({
  onPress,
  className,
  children,
  disabled = false,
  ...rest
}: {
  onPress: () => void;
  className: string;
  children: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      className={className}
      onPointerDown={(event: PointerEvent) => {
        // Some browsers still send pointer events to a disabled button.
        if (event.button !== 0 || disabled) return;
        event.preventDefault(); // no focus ring or text selection mid-game
        onPress();
      }}
      onClick={(event: MouseEvent) => {
        // A tap already acted on pointerdown; a keyboard press arrives as a click with no pointer.
        if (event.detail === 0 && !disabled) onPress();
      }}
    >
      {children}
    </button>
  );
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export interface LetterKeysState {
  tiles: { id: number; letter: string }[];
  selected: number[];
  /** The word being built. */
  word: string;
  tap: (id: number) => void;
  erase: () => void;
  mix: () => void;
  /** Empties the word, after sending it. */
  clear: () => void;
}

/** The keys of a set of letters: which ones make the word, in the order they were tapped. */
export function useLetterKeys(letters: readonly string[]): LetterKeysState {
  const [tiles, setTiles] = useState(() => letters.map((letter, id) => ({ id, letter })));
  const [selected, setSelected] = useState<number[]>([]);
  const word = selected.map((id) => tiles.find((tile) => tile.id === id)?.letter ?? "").join("");

  const tap = (id: number) => {
    // A step up the scale for each letter of the word.
    if (!selected.includes(id)) playSound("letter", selected.length);
    setSelected((current) => (current.includes(id) ? current : [...current, id]));
  };
  const erase = () => {
    if (selected.length > 0) playSound("erase");
    setSelected((current) => current.slice(0, -1));
  };
  const mix = () => {
    playSound("shuffle");
    setSelected([]);
    setTiles((current) => shuffled(current));
  };

  return { tiles, selected, word, tap, erase, mix, clear: () => setSelected([]) };
}

/** A physical keyboard on the same keys: letters, Backspace and Enter (`onSend`). */
export function useTyping(keys: LetterKeysState, onSend: () => void, enabled = true): void {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) return;
    if (event.key === "Enter") return void onSend();
    if (event.key === "Backspace") return keys.erase();
    const letter = event.key.toLocaleUpperCase("es");
    if (!/^[A-ZÑ]$/.test(letter)) return;
    const free = keys.tiles.find((tile) => tile.letter === letter && !keys.selected.includes(tile.id));
    if (free) keys.tap(free.id);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}

/** The word being built, the letters and the three buttons. Ten letters go in two rows of five big keys. */
export function LetterKeys({ keys, toast, onSend, disabled = false }: { keys: LetterKeysState; toast: ToastState | null; onSend: () => void; disabled?: boolean }) {
  const twoRows = keys.tiles.length > 7;
  return (
    <>
      <div className="relative mx-5 mt-4">
        <FloatingToast toast={toast} className="-top-3.5" />
        <div
          aria-live="polite"
          className="flex h-[72px] items-center justify-center gap-1 rounded-tile bg-white font-display text-[30px] font-extrabold tracking-[.08em] shadow-md"
        >
          {keys.word}
          {!disabled && <span aria-hidden className="ml-1 inline-block h-[34px] w-[3px] animate-pulse rounded-sm bg-letras" />}
        </div>
      </div>

      <div className={cx("grid touch-manipulation px-5 pt-4 select-none", twoRows ? "grid-cols-5 gap-2" : "grid-cols-7 gap-1.5")}>
        {keys.tiles.map((tile) => {
          const used = keys.selected.includes(tile.id);
          return (
            <PressButton
              key={tile.id}
              onPress={() => keys.tap(tile.id)}
              disabled={used || disabled}
              aria-label={`Letra ${tile.letter}`}
              className={cx(
                "grid place-items-center rounded-key font-display font-extrabold transition-colors duration-100 active:scale-95",
                twoRows ? "h-16 text-[28px]" : "h-14 text-2xl",
                used || disabled
                  ? "bg-white text-ink-300 shadow-[inset_0_0_0_2px_#D9DDF3]"
                  : "bg-letras text-white shadow-[0_8px_16px_rgba(255,107,74,.3)]",
              )}
            >
              {tile.letter}
            </PressButton>
          );
        })}
      </div>

      <div className="grid touch-manipulation grid-cols-[1fr_1fr_1.4fr] gap-2 px-5 pt-3 select-none">
        <PressButton onPress={keys.erase} disabled={disabled} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-bold shadow-sm active:scale-[.98]">
          <Delete className="size-4" strokeWidth={2.4} />
          Borrar
        </PressButton>
        <PressButton onPress={keys.mix} disabled={disabled} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-bold shadow-sm active:scale-[.98]">
          <Shuffle className="size-4" strokeWidth={2.4} />
          Mezclar
        </PressButton>
        <PressButton
          onPress={onSend}
          disabled={disabled}
          className={cx(
            "flex h-12 items-center justify-center gap-2 rounded-full font-display text-[15px] font-extrabold text-white active:scale-[.98]",
            disabled ? "bg-ink-300" : "bg-letras shadow-[0_10px_20px_rgba(255,107,74,.35)]",
          )}
        >
          <Send className="size-4" strokeWidth={2.4} />
          Enviar
        </PressButton>
      </div>
    </>
  );
}

/** A sent word: it shows up at once, and the server's answer marks it later. */
export interface SentWord {
  word: string;
  status: "checking" | "valid" | "invalid" | "unverified";
  /** Points it added to the score, once it's valid. */
  delta?: number;
}

const STATUS_LABELS: Record<SentWord["status"], string> = {
  checking: "verificando",
  valid: "vale",
  invalid: "no vale",
  unverified: "sin verificar todavía",
};

/** White chip: gray with dots while checking, "+N" when valid, a red circle when not. */
export function WordChip({ entry }: { entry: SentWord }) {
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
