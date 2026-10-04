"use client";

import { useEffect, useRef, useState } from "react";
import { battlesApi } from "@/lib/api";
import type { BattleView, TriviaMatchView, TriviaQuestionView } from "@/lib/battle-types";
import { playSound } from "@/lib/sound";
import { useServerTime } from "@/lib/use-battle";
import { BattleQuestion, type RevealRow } from "./BattleQuestion";
import { peopleOf } from "./faces";

/** A phone asks for the question a little before it opens, so it shows right on time. */
const FETCH_AHEAD_MS = 300;

/**
 * Cinco Preguntas a la par on this phone: it gets each question when it
 * opens, sends the answer and waits for everyone; then the right answer
 * and the table, until the next one.
 */
export function TriviaLive({ view, match, now, refresh, onExit }: { view: BattleView; match: TriviaMatchView; now: () => number; refresh: () => void; onExit: () => void }) {
  const time = useServerTime(now, 200);
  const round = match.round;
  const [question, setQuestion] = useState<TriviaQuestionView | null>(null);
  const [chosen, setChosen] = useState<{ index: number; choice: number } | null>(null);
  const person = peopleOf(view);

  const roundIndex = round?.index ?? -1;
  const roundOpen = round !== null && !round.closed;
  const opensAt = round?.opensAt ?? 0;
  const haveQuestion = question?.index === roundIndex;

  // Each question is asked for once, right before it opens.
  useEffect(() => {
    if (!roundOpen || haveQuestion) return;
    let alive = true;
    let retry = 0;
    const ask = () =>
      battlesApi.question(view.id, roundIndex).then(
        (next) => alive && setQuestion(next),
        () => {
          if (alive && retry++ < 3) window.setTimeout(ask, 400);
        },
      );
    const id = window.setTimeout(ask, Math.max(0, opensAt - FETCH_AHEAD_MS - now()));
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [view.id, roundIndex, roundOpen, haveQuestion, opensAt, now]);

  const myChoice = chosen?.index === roundIndex ? chosen.choice : match.myChoice;
  const showing = haveQuestion && question && time >= question.opensAt;
  const left = showing ? question.answerUntil - time : match.answerMs;
  const timedOut = showing && left <= 0;
  const phase = !round ? "loading" : round.closed ? "revealed" : !showing ? "loading" : myChoice !== null || timedOut ? "waiting" : "answering";
  const seconds = Math.max(0, Math.ceil(left / 1000));

  // The sounds: the question, the clock in the last five seconds, and how it went.
  const lastSound = useRef("");
  useEffect(() => {
    const key = `${roundIndex}:${phase}`;
    if (lastSound.current === key) return;
    lastSound.current = key;
    if (phase === "answering") playSound("question");
    if (phase === "revealed") {
      const result = match.reveals.find((reveal) => reveal.index === roundIndex)?.results.find((one) => one.userId === view.meId);
      if (!result?.answered) playSound("timeUp");
      else if (result.correct) playSound("correct", result.points >= 190);
      else playSound("wrong");
    }
  }, [roundIndex, phase, match.reveals, view.meId]);
  const lastTick = useRef(0);
  useEffect(() => {
    if (phase !== "answering" || seconds > 5 || seconds === 0 || seconds === lastTick.current) return;
    lastTick.current = seconds;
    playSound("tick", seconds % 2 === 0);
  }, [phase, seconds]);

  const choose = (choice: number) => {
    if (!question || phase !== "answering") return;
    setChosen({ index: question.index, choice });
    playSound("letter", 2);
    battlesApi.answer(view.id, question.index, choice).then(refresh, refresh);
  };

  const playing = view.players.filter((player) => player.playing).map((player) => person(player.userId));
  const answered = new Set(match.answered);
  if (myChoice !== null) answered.add(view.meId);
  const mine = match.standings.find((row) => row.userId === view.meId);
  const outcomes = match.reveals.map((reveal) => reveal.results.find((one) => one.userId === view.meId)?.correct ?? false);

  const reveal = round?.closed ? match.reveals.find((one) => one.index === round.index) : undefined;
  const before = reveal ? match.reveals.find((one) => one.index === reveal.index - 1) : undefined;
  const rows: RevealRow[] =
    reveal?.table.map((row) => {
      const result = reveal.results.find((one) => one.userId === row.userId);
      const was = before?.table.find((one) => one.userId === row.userId)?.place ?? row.place;
      return {
        face: person(row.userId),
        place: row.place,
        total: row.score,
        points: result?.points ?? 0,
        answered: result?.answered ?? false,
        correct: result?.correct ?? false,
        seconds: result?.seconds ?? null,
        move: before ? was - row.place : 0,
      };
    }) ?? [];

  return (
    <BattleQuestion
      question={{
        index: round?.index ?? 0,
        total: match.questionCount,
        prompt: reveal?.prompt ?? question?.prompt ?? "…",
        category: haveQuestion && question ? question.category : "",
        options: haveQuestion && question ? question.options : [],
      }}
      phase={phase}
      outcomes={outcomes}
      secondsLeft={seconds}
      fraction={Math.max(0, Math.min(1, left / match.answerMs))}
      faces={playing}
      answered={answered}
      choice={myChoice}
      me={{ place: mine?.place ?? 1, score: mine?.score ?? 0, article: person(view.meId).article }}
      reveal={reveal ? { correctText: reveal.correctText, rows, nextIn: Math.max(0, Math.ceil(((round?.nextAt ?? time) - time) / 1000)) } : undefined}
      onChoose={choose}
      onExit={onExit}
    />
  );
}
