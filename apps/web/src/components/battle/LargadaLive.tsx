"use client";

import { Hourglass, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from "react";
import { FloatingToast, useToast } from "@/components/games/chrome";
import { carColors } from "@/components/largada/Car";
import type { Racer } from "@/components/largada/field";
import { battlesApi } from "@/lib/api";
import type { BattleView, LargadaMatchView, LargadaRoundView, LargadaStartView } from "@/lib/battle-types";
import { RACE, departures, placements, raceEndMs } from "@/lib/largada";
import type { LargadaStart } from "@/lib/largada-types";
import { useMediaQuery } from "@/lib/hooks";
import { duckMusic, playSound, restoreMusic, vibrate } from "@/lib/sound";
import { BattleLargada, type BattleLargadaPhase, type LargadaStanding } from "./BattleLargada";
import { peopleOf } from "./faces";

const asStart = (start: LargadaStartView): LargadaStart => ({
  reactionMs: start.outcome === "hit" ? start.reactionMs : null,
  falseStart: start.outcome === "false-start" || start.outcome === "impossible",
});

/** Largada a la par on this phone: each start is its own round, with the lights the server set for everyone. */
export function LargadaLive(props: { view: BattleView; match: LargadaMatchView; now: () => number; refresh: () => void; onExit: () => void }) {
  const round = props.match.rounds.at(-1);
  if (!round) return null;
  return <LargadaRound key={round.index} {...props} round={round} />;
}

function LargadaRound({
  view,
  match,
  round,
  now,
  refresh,
  onExit,
}: {
  view: BattleView;
  match: LargadaMatchView;
  round: LargadaRoundView;
  now: () => number;
  refresh: () => void;
  onExit: () => void;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [phase, setPhase] = useState<BattleLargadaPhase>("lights");
  const [lights, setLights] = useState(0);
  const [mine, setMine] = useState<LargadaStart | null>(null);
  const [t, setT] = useState(0);
  const [toast, showToast] = useToast(1500);
  const goAt = useRef<number | null>(null);
  const signalAt = useRef(0);
  const sent = useRef(false);
  const frame = useRef(0);
  const person = peopleOf(view);

  // Top to bottom the others, in the order they came, and the player last (like the daily Largada).
  const ids = [...match.players.filter((id) => id !== view.meId), ...(match.players.includes(view.meId) ? [view.meId] : [])];
  const field: Racer[] = ids.map((id, i) => {
    const who = person(id);
    return { key: id, name: who.isMe ? "Vos" : who.name, avatar: who.avatar, article: who.article, colors: carColors(who.avatar), number: i + 1, crown: false, me: who.isMe, ghost: false, starts: [] };
  });
  const fromServer = new Map(round.starts.map((start) => [start.userId, asStart(start)]));
  const starts = ids.map((id) => (id === view.meId ? (mine ?? fromServer.get(id) ?? null) : (fromServer.get(id) ?? null)));

  const send = (start: LargadaStart) => {
    if (sent.current) return;
    sent.current = true;
    setMine(start);
    setPhase("waiting");
    setLights(0);
    // After the tap, so the sound never tells when the lights went out.
    playSound(start.falseStart ? "error" : start.reactionMs === null ? "timeUp" : "launch");
    if (start.falseStart) showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: "Te adelantaste · vale 450 ms" });
    else if (start.reactionMs === null) showToast({ tone: "danger", icon: <Hourglass className="size-3.5" strokeWidth={3} />, text: "Muy lento · vale 700 ms" });
    battlesApi.largadaStart(view.id, round.index, start.reactionMs, start.falseStart).then(refresh, refresh);
  };
  const onMiss = useEffectEvent(() => send({ reactionMs: null, falseStart: false }));
  const onSignal = useEffectEvent(() => {
    if (sent.current) return;
    setLights(0);
    setPhase("go");
    vibrate(40);
    goAt.current = null;
    signalAt.current = 0;
    requestAnimationFrame((first) => {
      signalAt.current = first;
      requestAnimationFrame((painted) => (goAt.current = painted));
    });
  });

  // The five lights and the signal, at the server's times: the same moment on every phone.
  const begin = useEffectEvent(() => {
    const timers: number[] = [];
    const at = (serverTime: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, serverTime - now())));
    if (now() >= round.signalAt - 30) {
      // The phone got this start when the lights were already out: it counts as not started, right away, so nobody waits.
      sent.current = true;
      at(0, () => setPhase("waiting"));
      battlesApi.largadaStart(view.id, round.index, null, false).then(refresh, refresh);
      return () => timers.forEach((id) => window.clearTimeout(id));
    }
    for (let light = 1; light <= match.lights; light++) {
      at(round.lightsAt + match.firstLightMs + (light - 1) * match.lightMs, () => {
        if (sent.current) return;
        setLights(light);
        playSound("knock");
        vibrate(15);
      });
    }
    at(round.signalAt, () => onSignal());
    at(round.signalAt + match.maxReactionMs, () => onMiss());
    return () => timers.forEach((id) => window.clearTimeout(id));
  });
  useEffect(() => begin(), []);

  const onPress = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("[data-no-tap]") || sent.current) return;
    if (phase === "lights") send({ reactionMs: null, falseStart: true });
    else if (phase === "go") {
      const tapped = performance.now();
      // Tapped before the signal was even painted: that was anticipating.
      send({ reactionMs: Math.round(tapped - (goAt.current ?? (signalAt.current || tapped))), falseStart: false });
    }
  };

  // The race, on every phone at once, when the server says everyone is in.
  const raceAt = round.raceAt;
  const allStarts = round.closedAt !== null ? round.starts : null;
  const race = useEffectEvent(() => {
    if (!allStarts) return;
    const known = ids.map((id) => asStart(allStarts.find((start) => start.userId === id) ?? { userId: id, outcome: "miss", reactionMs: null }));
    const leave = departures(known, match.maxReactionMs);
    const end = Math.min(raceEndMs(leave), RACE.arrivalMs);
    const arrive = () => {
      setPhase("arrival");
      const me = ids.indexOf(view.meId);
      if (me !== -1 && known[me]?.reactionMs != null) playSound("place", placements(known, match.maxReactionMs)[me]!);
    };
    setPhase("race");
    if (reduced) {
      setT(end + 1_200);
      arrive();
      return;
    }
    let startedAt: number | null = null;
    let arrived = false;
    const tick = (stamp: number) => {
      startedAt ??= stamp;
      const elapsed = stamp - startedAt;
      setT(elapsed);
      if (!arrived && elapsed >= end) {
        arrived = true;
        arrive();
      }
      if (elapsed < end + 1_200) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  });
  useEffect(() => {
    if (raceAt === null) return;
    const id = window.setTimeout(() => race(), Math.max(0, raceAt - now()));
    return () => {
      window.clearTimeout(id);
      cancelAnimationFrame(frame.current);
    };
  }, [raceAt, now]);

  // The music steps back with the lights and comes back after the tap; it doesn't move at the signal.
  const hushed = phase === "lights" || phase === "go";
  useEffect(() => {
    if (hushed) duckMusic(0.35);
    else restoreMusic();
  }, [hushed]);
  useEffect(() => () => restoreMusic(), []);

  const table: LargadaStanding[] = match.standings.map((row) => ({ face: person(row.userId), place: row.place, averageMs: row.averageMs ?? null }));
  return (
    <>
      <BattleLargada
        phase={phase}
        round={round.index}
        total={match.startCount}
        lights={lights}
        t={t}
        field={field}
        starts={starts}
        table={table}
        article={person(view.meId).article}
        maxReactionMs={match.maxReactionMs}
        onExit={onExit}
        onPress={onPress}
      />
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+150px)] z-30 mx-auto h-0 max-w-[430px]">
        <FloatingToast toast={toast} />
      </div>
    </>
  );
}
