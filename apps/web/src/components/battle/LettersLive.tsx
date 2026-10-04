"use client";

import { RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/games/chrome";
import { useLetterKeys, useTyping, type SentWord } from "@/components/games/letters";
import { ApiError, battlesApi } from "@/lib/api";
import type { BattleView, LettersMatchView } from "@/lib/battle-types";
import { playSound } from "@/lib/sound";
import { useServerTime } from "@/lib/use-battle";
import { BattleLetters, type LettersLiveRow } from "./BattleLetters";
import { peopleOf } from "./faces";

/** Network hiccups get a few more tries while the time lasts. */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

type Props = { view: BattleView; match: LettersMatchView; now: () => number; refresh: () => void; onExit: () => void };

/**
 * Diez Letras a la par on this phone: the letters come a moment before the
 * countdown ends; each word is sent without waiting for the check, and the
 * server's answer marks it. My points count at once; the others' come with
 * each answer of the server (every second).
 */
export function LettersLive(props: Props) {
  const { match } = props;
  if (!match.letters) return <LettersScreen {...props} letters={null} />;
  // A new set of letters is a new board.
  return <LettersScreen key={match.id} {...props} letters={match.letters} />;
}

function LettersScreen({ view, match, now, onExit, letters }: Props & { letters: string[] | null }) {
  const time = useServerTime(now, 200);
  const person = peopleOf(view);
  const [toast, showToast] = useToast();
  // Newest first. A phone that comes back mid-game starts from the words the server has.
  const [sent, setSent] = useState<SentWord[]>(() => match.mine.map((one) => ({ word: one.word, status: "valid" as const, delta: one.points })).reverse());
  const sentWords = useRef(new Set(match.mine.map((one) => one.word)));

  const round = match.round;
  const leftMs = round ? round.opensAt + match.durationMs - time : match.durationMs;
  const timeUp = round !== null && (round.closed || (time > 0 && leftMs <= 0));
  const phase = !letters ? "loading" : timeUp ? "time-up" : "playing";
  // Retries stop when the time is up.
  const over = useRef(false);
  useEffect(() => {
    over.current = phase === "time-up";
  }, [phase]);

  const mark = (word: string, change: Partial<SentWord>) => setSent((current) => current.map((entry) => (entry.word === word ? { ...entry, ...change } : entry)));

  /** Asks the server whether the word counts, while the player keeps going. */
  const check = async (word: string, attempt = 0): Promise<void> => {
    try {
      const response = await battlesApi.word(view.id, word);
      if (response.status === "invalid" || response.status === "too-short") {
        playSound("error");
        return mark(word, { status: "invalid" });
      }
      // "duplicate": an earlier try got there, its answer didn't. It counted.
      mark(word, { status: "valid", delta: response.points });
      if (response.status === "duplicate") return;
      if (response.word.length === letters?.length) {
        playSound("jackpot");
        showToast({ tone: "success", icon: <Sparkles className="size-3.5" strokeWidth={2.6} />, text: `¡${response.word}! La de ${letters.length} letras +${response.points}` });
      } else playSound("word", response.word.length);
    } catch (error) {
      const retryable = !(error instanceof ApiError) || error.status >= 500;
      const delay = RETRY_DELAYS_MS[attempt];
      if (!retryable || delay === undefined || over.current) return mark(word, { status: "unverified" });
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      return check(word, attempt + 1);
    }
  };

  const board = useLetterKeys(letters ?? []);
  const keys = letters ? board : null;
  const send = () => {
    if (!keys || phase !== "playing" || keys.word.length === 0) return;
    const word = keys.word;
    if (word.length < match.minWordLength) {
      playSound("nope");
      showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: `Tiene que tener ${match.minWordLength} letras o más` });
      return;
    }
    keys.clear();
    if (sentWords.current.has(word)) {
      playSound("nope");
      showToast({ tone: "gold", icon: <RotateCcw className="size-3.5" strokeWidth={3} />, text: `${word} ya la mandaste` });
      return;
    }
    sentWords.current.add(word);
    setSent((current) => [{ word, status: "checking" }, ...current]);
    void check(word);
  };
  useTyping(board, send, phase === "playing");

  // The clock ticks in the last 10 seconds, and "¡Tiempo!" sounds once.
  const seconds = Math.ceil(leftMs / 1000);
  const lastTick = useRef(0);
  useEffect(() => {
    if (phase !== "playing" || seconds > 10 || seconds <= 0 || seconds === lastTick.current) return;
    lastTick.current = seconds;
    playSound("tick", seconds % 2 === 0);
  }, [phase, seconds]);
  const rang = useRef(false);
  useEffect(() => {
    if (phase !== "time-up" || rang.current) return;
    rang.current = true;
    playSound("timeUp");
  }, [phase]);

  // The table: the server's, with my own points as soon as I find them.
  const myPoints = sent.reduce((sum, entry) => sum + (entry.status === "valid" ? (entry.delta ?? 0) : 0), 0);
  const scores = match.standings.map((row) => ({ userId: row.userId, points: row.userId === view.meId ? Math.max(myPoints, row.score) : row.score }));
  if (!scores.some((row) => row.userId === view.meId)) scores.push({ userId: view.meId, points: myPoints });
  const sorted = [...scores].sort((a, b) => b.points - a.points);
  const rows: LettersLiveRow[] = sorted.map((row) => ({ face: person(row.userId), place: 1 + sorted.filter((other) => other.points > row.points).length, points: row.points }));
  const mine = rows.find((row) => row.face.key === view.meId);

  return (
    <BattleLetters
      phase={phase}
      leftMs={Math.max(0, leftMs)}
      rows={rows}
      me={{ place: mine?.place ?? 1, points: mine?.points ?? 0, article: person(view.meId).article }}
      keys={keys}
      letterCount={letters?.length ?? 10}
      sent={sent}
      toast={toast}
      podiumIn={round?.nextAt ? Math.max(0, Math.ceil((round.nextAt - time) / 1000)) : null}
      onSend={send}
      onExit={onExit}
    />
  );
}
