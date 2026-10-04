"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { battlesApi } from "@/lib/api";
import type { BattleView, SequenceMatchView, SequenceRoundView } from "@/lib/battle-types";
import { namesList } from "@/lib/largada";
import { duckMusic, playSound, restoreMusic } from "@/lib/sound";
import { useServerTime } from "@/lib/use-battle";
import { BattleSequence, type SequenceBanner, type SequenceFace } from "./BattleSequence";
import { peopleOf } from "./faces";

type Props = { view: BattleView; match: SequenceMatchView; now: () => number; refresh: () => void; onExit: () => void };

/** Each color lights up this long, then stays dark until the next one (as in the daily challenge). */
const LIT_MS = 400;

/**
 * Secuencia a la par on this phone: each round shows its colors at the
 * server's times, the same moment on every phone; then the player repeats
 * them and sends what they tapped. Between rounds, who's out.
 */
export function SequenceLive(props: Props) {
  const current = props.match.current;
  if (current) return <SequenceRound key={current.index} {...props} round={current} />;
  return <SequenceBetween {...props} />;
}

/** Where I went out, if I did: the round that left me out. */
function myExit(match: SequenceMatchView, meId: string): SequenceRoundView | undefined {
  return match.rounds.find((round) => round.out?.includes(meId));
}

function SequenceRound({ view, match, round, now, refresh, onExit }: Props & { round: SequenceRoundView & { colors: number[] } }) {
  const person = peopleOf(view);
  const time = useServerTime(now, 200);
  const playing = round.players.includes(view.meId);
  const [phase, setPhase] = useState<"watch" | "input" | "done" | "wrong" | "late">(() =>
    match.mine ? (match.mine.correct ? "done" : "wrong") : "watch",
  );
  const [shown, setShown] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [inputs, setInputs] = useState<number[]>([]);
  // The ref stops a second send at once; the state shows it on screen.
  const sent = useRef(match.mine !== null);
  const [answeredMine, setAnsweredMine] = useState(match.mine !== null);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, Math.max(0, ms)));
  const send = (tapped: number[]) => {
    if (sent.current) return;
    sent.current = true;
    setAnsweredMine(true);
    battlesApi.repeat(view.id, round.index, tapped).then(refresh, refresh);
  };
  const onTimeUp = useEffectEvent(() => {
    if (sent.current) return;
    // Whoever was halfway counts as having tried; whoever didn't tap, as not answering.
    if (inputs.length > 0) send(inputs);
    else sent.current = true;
    playSound("timeUp");
    setPhase("late");
  });

  // The colors at the server's times, then the turn to repeat them and the end of the time.
  const begin = useEffectEvent(() => {
    round.colors.forEach((pad, i) => {
      const at = round.showAt + match.leadMs + i * match.showMsPerItem;
      if (at + LIT_MS < now()) return;
      later(() => {
        setActive(pad);
        setShown(i + 1);
        // Each pad sings its own note, like a Simon.
        playSound("pad", pad, 0.38);
      }, at - now());
      later(() => setActive((lit) => (lit === pad ? null : lit)), at + LIT_MS - now());
    });
    if (!playing || sent.current) return;
    later(() => setPhase((current) => (current === "watch" ? "input" : current)), round.inputAt - now());
    later(() => onTimeUp(), round.answerUntil - now());
  });
  useEffect(() => {
    begin();
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  // While the colors show, the music steps back so their notes are heard.
  const watching = time > 0 && time < round.inputAt;
  useEffect(() => {
    if (watching) duckMusic(0.3);
    else restoreMusic();
  }, [watching]);
  useEffect(() => () => restoreMusic(), []);

  const press = (pad: number) => {
    if (phase !== "input" || sent.current) return;
    setActive(pad);
    later(() => setActive((lit) => (lit === pad ? null : lit)), 180);
    const next = [...inputs, pad];
    setInputs(next);
    if (pad !== round.colors[next.length - 1]) {
      playSound("fail");
      setPhase("wrong");
      send(next);
      return;
    }
    playSound("pad", pad, 0.16);
    if (next.length < round.colors.length) return;
    later(() => playSound("levelUp"), 200);
    setPhase("done");
    send(next);
  };

  const answered = new Set(match.answered);
  if (answeredMine) answered.add(view.meId);
  const out = new Set(match.players.filter((id) => !round.players.includes(id)));
  const faces: SequenceFace[] = match.players.map((id) => ({ face: person(id), state: out.has(id) ? "out" : answered.has(id) ? "answered" : "in" }));
  const missing = round.players.filter((id) => !answered.has(id) && id !== view.meId).map((id) => person(id).name);
  const seconds = Math.max(0, Math.ceil((round.answerUntil - time) / 1000));
  const total = round.answerUntil - round.inputAt;

  let banner: SequenceBanner;
  if (!playing) banner = time < round.inputAt ? { kind: "watch", shown, length: round.length } : { kind: "watching", level: myExit(match, view.meId)?.level ?? round.level };
  else if (phase === "watch" || time === 0) banner = { kind: "watch", shown, length: round.length };
  else if (phase === "input") banner = { kind: "input", tapped: inputs.length, length: round.length, seconds, fraction: Math.max(0, Math.min(1, (round.answerUntil - time) / total)) };
  else if (phase === "done") banner = { kind: "done", waitingFor: missing.length > 0 ? namesList(missing) : null };
  else banner = { kind: phase };

  return (
    <BattleSequence
      level={round.level}
      replay={round.replay}
      banner={banner}
      faces={faces}
      still={round.players.length}
      active={active}
      enabled={playing && phase === "input"}
      onPress={press}
      onExit={onExit}
    />
  );
}

/** Between rounds: how the last one went, who's out, and what comes (the next round, a tiebreak or the podium). */
function SequenceBetween({ view, match, onExit }: Props) {
  const person = peopleOf(view);
  const last = match.rounds.at(-1);
  const exit = myExit(match, view.meId);

  // The sound of how it went for me.
  const sounded = useRef(-1);
  useEffect(() => {
    if (!last || last.closedAt === null || sounded.current === last.index) return;
    sounded.current = last.index;
    const mine = last.results?.find((one) => one.userId === view.meId);
    if (match.endsAt === null && last.passed?.length === 0) playSound("question");
    else if (mine?.outcome === "late") playSound("timeUp");
  }, [last, match.endsAt, view.meId]);

  if (!last || last.closedAt === null) {
    const faces: SequenceFace[] = match.players.map((id) => ({ face: person(id), state: "in" }));
    return <BattleSequence level={1} replay={false} banner={{ kind: "loading" }} faces={faces} still={faces.length} active={null} enabled={false} onPress={() => undefined} onExit={onExit} />;
  }

  // How each one did in the last round; whoever wasn't in it went out before.
  const results = new Map((last.results ?? []).map((one) => [one.userId, one.outcome]));
  const faces: SequenceFace[] = match.players.map((id) => {
    const outcome = results.get(id);
    return { face: person(id), state: !outcome ? "out" : outcome === "right" || outcome === "wrong" ? outcome : "late" };
  });

  const names = (ids: readonly string[]) => namesList(ids.map((id) => (id === view.meId ? "vos" : person(id).name)));
  const passed = last.passed ?? [];
  let banner: SequenceBanner;
  if (match.endsAt !== null) {
    const top = match.standings.filter((row) => row.place === 1).map((row) => row.userId);
    const text = top.length > 1 ? `¡Empate arriba! ${names(top)}` : top[0] === view.meId ? "¡Ganaste!" : top[0] ? `¡Ganó ${person(top[0]).name}!` : "Terminó la batalla";
    banner = { kind: "next", text, tone: top.includes(view.meId) ? "good" : "neutral" };
  } else if (passed.length === 0) {
    banner = { kind: "next", text: "¡Desempate! Se equivocaron todos: van de nuevo", tone: "replay" };
  } else if (passed.includes(view.meId)) {
    banner = { kind: "next", text: `¡Pasaste el nivel ${last.level}! Ya viene el próximo`, tone: "good" };
  } else if (exit && exit.index === last.index) {
    banner = { kind: "next", text: `Quedaste afuera en el nivel ${last.level}`, tone: "bad" };
  } else if (exit) {
    banner = { kind: "watching", level: exit.level };
  } else {
    banner = { kind: "next", text: `Siguen ${names(passed)}`, tone: "neutral" };
  }

  // Who goes on: the ones who passed, or everyone in a tiebreak.
  const still = last.players.length - (last.out?.length ?? 0);
  return <BattleSequence level={last.level} replay={last.replay} banner={banner} faces={faces} still={still} active={null} enabled={false} onPress={() => undefined} onExit={onExit} />;
}
