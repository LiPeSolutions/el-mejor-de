"use client";

import { usesLargada, type GameId } from "@repo/games";
import { DEFAULT_AVATAR } from "@repo/shared";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { LargadaIntro } from "@/components/largada/LargadaIntro";
import { LargadaPlay } from "@/components/largada/LargadaPlay";
import { raceField, type Racer } from "@/components/largada/field";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { lastUsername, loadAccount } from "@/lib/account";
import { ApiError, api, largadaApi } from "@/lib/api";
import { zeroResult } from "@/lib/challenge-results";
import type { PlayedAttempt, StartResponse } from "@/lib/challenge-types";
import { gameBySlug, gameStyle, themeOn, type GameSlug } from "@/lib/games";
import { useIsClient } from "@/lib/hooks";
import { saveLargadaRace } from "@/lib/largada-session";
import type { LargadaGridResponse } from "@/lib/largada-types";
import { lastGroupId, rememberGroup } from "@/lib/last-group";
import { unlockSound } from "@/lib/sound";
import { loadDay, practiceRecords, saveAttempt, savePracticeResult, updateAttempt } from "@/lib/storage";
import { useRequest } from "@/lib/use-request";
import { ExitDialog } from "./chrome";
import { FiveQuestionsPlay } from "./FiveQuestionsPlay";
import { GameIntro } from "./GameIntro";
import { ReflexesPlay } from "./ReflexesPlay";
import { SequencePlay } from "./SequencePlay";
import { SevenLettersPlay } from "./SevenLettersPlay";

type Props =
  | { mode: "daily"; slug: GameSlug; slot: number; position: number; date: string }
  | { mode: "practice"; slug: GameSlug };

type Stage = "redirecting" | "intro" | "playing" | "finishing" | "error";

function emptyLog(game: GameId): unknown {
  switch (game) {
    case "seven-letters":
      return { submissions: [] };
    case "five-questions":
      return { receipts: [] };
    case "reflexes":
      return { rounds: [] };
    case "sequence":
      return { levels: [] };
  }
}

/** Largada's grid, or a race against the clock if it takes too long. */
function loadGrid(groupId: string | null): Promise<LargadaGridResponse> {
  return Promise.race([largadaApi.grid(groupId), new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 6_000))]);
}

/** Runs one challenge: intro → play → grade on the server → result page. */
export function ChallengeRunner(props: Props) {
  const isClient = useIsClient();
  // Whether today's challenge was already played lives in localStorage, so decide in the browser.
  if (!isClient) return <Screen style={gameStyle(gameBySlug(props.slug)!)}>{null}</Screen>;
  return <Runner {...props} />;
}

function Runner(props: Props) {
  const base = gameBySlug(props.slug)!;
  // The days before Largada kept the color-change game (and its look).
  const game = props.mode === "daily" ? themeOn(base.id, props.date) : base;
  const largada = base.id === "reflexes" && usesLargada(props.mode, props.mode === "daily" ? props.date : "");
  const router = useRouter();
  const daily = props.mode === "daily";
  const resultHref = daily ? `/jugar/${props.slug}/resultado` : `/practicar/${props.slug}/resultado`;
  // A daily challenge is played once: a finished one goes to its result, and one
  // that was left halfway is graded with whatever was played before leaving.
  const [previous] = useState(() => (props.mode === "daily" ? loadDay(props.date).attempts[props.slot] : undefined));
  const resumable = previous?.status === "started" && previous.token ? previous : null;
  // Someone who has an account here but isn't signed in would play it without it.
  const [signedOutAs] = useState(() => (props.mode === "daily" && !loadAccount() ? lastUsername() : null));
  const [stage, setStage] = useState<Stage>(() => {
    if (previous?.status === "finished") return "redirecting";
    return resumable ? "finishing" : "intro";
  });
  const [start, setStart] = useState<StartResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const pending = useRef<{ token: string; log: unknown } | null>(null);
  const startedAt = useRef(previous?.startedAt ?? 0);

  // Largada races against the group's times of today (the last group opened), or the ghost.
  const [account] = useState(() => loadAccount());
  const [groupId, setGroupId] = useState(() => (largada ? lastGroupId() : null));
  const grid = useRequest(largada && stage === "intro" ? `largada:${groupId ?? ""}` : null, () => loadGrid(groupId));
  const gridValue = grid.data ?? (grid.error ? null : undefined);
  const me = { userId: account?.id ?? null, avatar: account?.avatar ?? DEFAULT_AVATAR, article: account?.article ?? "el" };
  const field = largada ? raceField(gridValue ?? null, me) : [];
  /** The cars of this race, fixed when it starts. */
  const [racing, setRacing] = useState<Racer[] | null>(null);
  const chooseGroup = (id: string) => {
    setGroupId(id);
    rememberGroup(id);
  };

  /** Sends the play log to the server, saves the graded result and shows it. */
  const grade = (token: string, log: unknown) => {
    pending.current = { token, log };
    return api.finish(token, log).then(
      (response) => {
        if (response.mode === "daily") {
          saveAttempt(response.date, { slot: response.slot, game: game.id, status: "finished", startedAt: startedAt.current, result: response.result });
        } else {
          savePracticeResult(response.date, response.result);
        }
        router.replace(resultHref);
      },
      (cause: unknown) => {
        if (props.mode === "daily" && cause instanceof ApiError && (cause.status === 410 || cause.status === 401)) {
          saveAttempt(props.date, { slot: props.slot, game: game.id, status: "finished", startedAt: startedAt.current, result: zeroResult(game.id) });
          router.replace(resultHref);
          return;
        }
        setStage("error");
      },
    );
  };

  const finish = (token: string, log: unknown) => {
    setStage("finishing");
    void grade(token, log);
  };

  const resume = useEffectEvent(() => {
    if (previous?.status === "finished") router.replace(resultHref);
    else if (resumable?.token) void grade(resumable.token, resumable.log ?? emptyLog(game.id));
  });
  useEffect(() => {
    resume();
  }, []);

  const begin = async () => {
    // Largada races the cars of the grid as it is now; and browsers play sound only after a tap: this one.
    const race = largada ? { grid: gridValue ?? null, field: raceField(gridValue ?? null, { userId: account?.id ?? null, avatar: account?.avatar ?? DEFAULT_AVATAR, article: account?.article ?? "el" }) } : null;
    if (race) unlockSound();
    setStarting(true);
    setError(null);
    try {
      const response = props.mode === "daily" ? await api.startDaily(props.slot) : await api.startPractice(props.slug);
      startedAt.current = Date.now();
      if (props.mode === "daily") {
        saveAttempt(response.date, { slot: props.slot, game: game.id, status: "started", token: response.token, startedAt: startedAt.current });
      }
      if (race) {
        setRacing(race.field);
        saveLargadaRace(props.mode, { date: response.date, userId: account?.id ?? null, field: race.field, group: race.grid?.group ?? null, crown: race.grid?.crown ?? null });
      }
      setStart(response);
      setStage("playing");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "already-played") {
        // Played before (in another tab, or this browser forgot it): show what the server saved.
        const played = cause.details.attempt as PlayedAttempt | undefined;
        if (played?.status === "finished" && played.result) {
          saveAttempt(played.date, { slot: played.slot, game: game.id, status: "finished", startedAt: Date.now(), result: played.result });
          router.replace(resultHref);
          return;
        }
        setError("Ya empezaste este reto en otra pestaña o en otro momento, y cuenta como jugado. En unos minutos vas a poder ver el resultado.");
        return;
      }
      setError("No pudimos arrancar el reto. Revisá tu conexión y probá de nuevo.");
    } finally {
      setStarting(false);
    }
  };

  const onProgress = (log: unknown) => {
    if (!start) return;
    pending.current = { token: start.token, log };
    if (start.mode === "daily") updateAttempt(start.date, start.slot, { log });
  };
  const onFinish = (log: unknown) => {
    if (start) finish(start.token, log);
  };
  const onExit = () => setExitOpen(true);

  const leave = () => {
    setExitOpen(false);
    if (!start) return router.push(daily ? "/" : "/practicar");
    if (daily) return finish(start.token, pending.current?.log ?? emptyLog(game.id));
    router.push("/practicar");
  };

  const retry = () => {
    if (pending.current) finish(pending.current.token, pending.current.log);
  };

  if (stage === "redirecting") return <Screen style={gameStyle(game)}>{null}</Screen>;
  if (stage === "finishing" || stage === "error") return <Finishing error={stage === "error"} onRetry={retry} />;
  const signInHint = signedOutAs ? { username: signedOutAs, href: `/cuenta/entrar?volver=/jugar/${props.slug}` } : undefined;
  if ((stage === "intro" || !start) && largada) {
    return (
      <LargadaIntro
        game={game}
        practice={!daily}
        position={daily ? props.position : undefined}
        closeHref={daily ? "/" : "/practicar"}
        starting={starting || gridValue === undefined}
        error={error}
        onStart={begin}
        grid={gridValue}
        field={field}
        onGroup={chooseGroup}
        signInHint={signInHint}
      />
    );
  }
  if (stage === "intro" || !start) {
    return (
      <GameIntro
        game={game}
        practice={!daily}
        position={daily ? props.position : undefined}
        closeHref={daily ? "/" : "/practicar"}
        starting={starting}
        error={error}
        onStart={begin}
        signInHint={signInHint}
      />
    );
  }

  const view = start.view;
  const common = { onProgress, onFinish, onExit };
  return (
    <div style={gameStyle(game)}>
      {view.game === "seven-letters" && <SevenLettersPlay view={view} token={start.token} {...common} />}
      {view.game === "five-questions" && <FiveQuestionsPlay view={view} token={start.token} {...common} />}
      {view.game === "reflexes" && view.version === "largada" && <LargadaPlay view={view} field={racing ?? raceField(null, me)} article={account?.article ?? "el"} {...common} />}
      {view.game === "reflexes" && view.version !== "largada" && <ReflexesPlay view={view} {...common} />}
      {view.game === "sequence" && <SequencePlay view={view} token={start.token} record={practiceRecords().sequence?.best ?? null} {...common} />}
      <ExitDialog open={exitOpen} practice={!daily} onStay={() => setExitOpen(false)} onLeave={leave} />
    </div>
  );
}

function Finishing({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  return (
    <Screen className="items-center justify-center px-8 text-center">
      {error ? (
        <>
          <h1 className="font-display text-[28px] leading-tight font-extrabold">No pudimos guardar tu resultado</h1>
          <p className="mt-2 text-[15px] font-medium text-ink-700">Revisá tu conexión. Tu partida no se perdió.</p>
          <div className="mt-6 w-full">
            <Button onClick={onRetry}>Reintentar</Button>
          </div>
        </>
      ) : (
        <p className="font-display text-xl font-extrabold text-ink-700" role="status">
          Contando tus puntos…
        </p>
      )}
    </Screen>
  );
}
