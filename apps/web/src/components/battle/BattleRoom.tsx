"use client";

import type { GameId } from "@repo/games";
import { House, LogIn, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GroupsMessage } from "@/components/groups/parts";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { ApiError, battlesApi } from "@/lib/api";
import type { BattleView, MatchView } from "@/lib/battle-types";
import { GAMES } from "@/lib/games";
import type { SongKey } from "@/lib/music";
import { playSoundLater, useMusic } from "@/lib/sound";
import { useBattle, useServerTime, type BattleProblem } from "@/lib/use-battle";
import { BattleCountdown } from "./BattleCountdown";
import { BattleLobby, type LobbyPlayer } from "./BattleLobby";
import { BattlePodium, type PodiumRow } from "./BattlePodium";
import { homeOf, peopleOf } from "./faces";
import { LargadaLive } from "./LargadaLive";
import { TriviaLive } from "./TriviaLive";
import { WaitingPill } from "./parts";

const CLOUDS = ["-right-[60px] top-[90px] w-[180px] opacity-95", "-left-[50px] bottom-[180px] w-[220px] opacity-95"];

const SONG_FOR: Record<GameId, SongKey> = {
  "seven-letters": "letras",
  "five-questions": "preguntas",
  reflexes: "largada",
  sequence: "secuencia",
  "water-sort": "tubitos",
};

/** The games a room can choose: the two of the first batch, and the ones on their way. */
const CHOICES = [
  { game: GAMES.reflexes, soon: false },
  { game: GAMES["five-questions"], soon: false },
  { game: GAMES["seven-letters"], soon: true },
  { game: GAMES.sequence, soon: true },
];

const ERRORS: Record<string, string> = {
  "not-enough-players": "Hacen falta 2 para empezar.",
  "match-running": "Ya hay una partida en juego.",
  "not-host": "Solo quien arma la batalla puede hacer eso.",
  "battle-closed": "La batalla terminó.",
};

function errorText(error: unknown): string {
  if (error instanceof ApiError) return ERRORS[error.code] ?? "No pudimos hacerlo. Probá de nuevo.";
  return "Sin conexión. Probá de nuevo.";
}

/** A battle's page (/batalla/ID): the room, the countdown, the game and the podium, as the server says. */
export function BattleRoom({ id }: { id: string }) {
  const account = useAccount();
  if (account === undefined) return <Screen>{null}</Screen>;
  if (!account) {
    return (
      <Message title="Entrá a tu cuenta" text="Las batallas se juegan con tu cuenta.">
        <Button href={`/cuenta/entrar?volver=${encodeURIComponent(`/batalla/${id}`)}`}>
          <LogIn className="size-5" strokeWidth={2.4} />
          Entrar
        </Button>
      </Message>
    );
  }
  return <Room id={id} />;
}

function Room({ id }: { id: string }) {
  const router = useRouter();
  const { view, problem, now, refresh, grid } = useBattle(id);
  const [leaving, setLeaving] = useState(false);
  const stage = view?.stage ?? "lobby";
  // Every phone in the room plays the same song in step.
  useMusic(view && (stage === "match" || stage === "podium") && view.match ? SONG_FOR[view.match.game] : "menu", grid);
  useWakeLock(stage === "match");

  const leave = () => {
    setLeaving(false);
    const home = homeOf(view);
    battlesApi.leave(id).then(
      () => router.replace(home),
      () => router.replace(home),
    );
  };

  if (problem && (!view || problem !== "network")) return <Problem kind={problem} id={id} home={homeOf(view)} />;
  if (!view) return <Screen>{null}</Screen>;

  let body: ReactNode;
  if (view.stage === "closed") body = <Problem kind="closed" id={id} home={homeOf(view)} />;
  else if (view.stage === "lobby") body = <Lobby view={view} refresh={refresh} onLeave={leave} />;
  else if (view.stage === "podium" && view.match) body = <Podium view={view} match={view.match} refresh={refresh} onLeave={leave} />;
  else if (view.match) body = <Playing view={view} match={view.match} now={now} refresh={refresh} onExit={() => setLeaving(true)} />;
  else body = <Screen>{null}</Screen>;

  return (
    <>
      {body}
      {leaving && <LeaveSheet onStay={() => setLeaving(false)} onLeave={leave} />}
    </>
  );
}

/** Keeps the screen on during a match, where nobody may touch it for a while (the lights, the others' answers). */
function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const take = () =>
      navigator.wakeLock.request("screen").then(
        (sentinel) => {
          if (alive) lock = sentinel;
          else void sentinel.release();
        },
        () => undefined,
      );
    void take();
    // The phone lets go of it when the app goes to the background.
    const onVisible = () => document.visibilityState === "visible" && void take();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}

/* ───────────── The room ───────────── */

function Lobby({ view, refresh, onLeave }: { view: BattleView; refresh: () => void; onLeave: () => void }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<LobbyPlayer | null>(null);
  const person = peopleOf(view);
  const host = view.hostId === view.meId;
  const hostName = host ? "Vos" : person(view.hostId).name;
  const link = `${window.location.origin}/b/${view.code}`;
  const game = GAMES[view.game];

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const act = (action: () => Promise<unknown>) => {
    setError(null);
    return action().then(refresh, (cause: unknown) => {
      setError(errorText(cause));
      refresh();
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError(`No pudimos copiar. El link es ${link.replace(/^https?:\/\//, "")}`);
    }
  };
  const invite = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Batalla en vivo", text: `¡Vení a jugar ${game.name} conmigo, en vivo! ⚡`, url: link });
      else await copy();
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) await copy();
    }
  };

  const players: LobbyPlayer[] = view.players
    .filter((player) => player.inRoom)
    .map((player) => ({ ...person(player.userId), host: player.host, online: player.online }));

  return (
    <>
      <BattleLobby
        group={view.group}
        game={game}
        choices={CHOICES}
        players={players}
        maxPlayers={view.maxPlayers}
        host={host}
        hostName={hostName}
        code={view.code}
        link={link}
        copied={copied}
        starting={starting}
        error={error}
        onPick={(next) => void act(() => battlesApi.chooseGame(view.id, next))}
        onStart={() => {
          setStarting(true);
          void act(() => battlesApi.start(view.id)).finally(() => setStarting(false));
        }}
        onInvite={() => void invite()}
        onCopy={() => void copy()}
        onLeave={onLeave}
        onPlayer={setRemoving}
      />
      {removing && (
        <Sheet title={`¿Sacás a ${removing.name} de la sala?`} text="No va a poder volver a esta batalla.">
          <Button
            size="md"
            variant="primary"
            className="bg-danger shadow-none"
            onClick={() => {
              const target = removing;
              setRemoving(null);
              void act(() => battlesApi.remove(view.id, target.key));
            }}
          >
            Sacar a {removing.name}
          </Button>
          <Button size="md" variant="neutral" onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
        </Sheet>
      )}
    </>
  );
}

/* ───────────── Playing ───────────── */

function Playing({ view, match, now, refresh, onExit }: { view: BattleView; match: MatchView; now: () => number; refresh: () => void; onExit: () => void }) {
  const time = useServerTime(now, 100);
  const person = peopleOf(view);
  const me = view.players.find((player) => player.me);
  if (!me?.playing) return <Watching view={view} match={match} onExit={onExit} />;
  if (time === 0 || time < match.startsAt) {
    const seconds = time === 0 ? 3 : Math.max(1, Math.ceil((match.startsAt - time) / 1000));
    return <BattleCountdown game={GAMES[match.game]} seconds={seconds} faces={match.players.map(person)} />;
  }
  return match.game === "five-questions" ? (
    <TriviaLive view={view} match={match} now={now} refresh={refresh} onExit={onExit} />
  ) : (
    <LargadaLive view={view} match={match} now={now} refresh={refresh} onExit={onExit} />
  );
}

/** Whoever came with the match running watches the table and plays the next one. */
function Watching({ view, match, onExit }: { view: BattleView; match: MatchView; onExit: () => void }) {
  const person = peopleOf(view);
  const game = GAMES[match.game];
  return (
    <Screen clouds={CLOUDS}>
      <GroupsMessage title="La batalla ya arrancó" face="wow">
        Estás en la sala: entrás en la próxima partida de {game.name}.
      </GroupsMessage>
      <ol className="mx-5 mt-5 flex flex-col gap-2 rounded-card bg-white px-3 py-3 shadow-md">
        {match.standings.map((row) => {
          const who = person(row.userId);
          return (
            <li key={row.userId} className="flex items-center gap-2.5 text-sm font-bold">
              <span className="w-5 font-display font-extrabold text-ink-500 tabular-nums">{row.place}</span>
              <span className="min-w-0 flex-1 truncate">{who.name}</span>
              <span className="font-display font-extrabold tabular-nums">{match.game === "reflexes" ? (row.averageMs ? `${row.averageMs} ms` : "—") : row.score}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
        <WaitingPill>Mirando cómo va</WaitingPill>
        <Button variant="secondary" size="md" onClick={onExit}>
          Salir de la batalla
        </Button>
      </div>
    </Screen>
  );
}

/* ───────────── The podium ───────────── */

function Podium({ view, match, refresh, onLeave }: { view: BattleView; match: MatchView; refresh: () => void; onLeave: () => void }) {
  const [busy, setBusy] = useState(false);
  const person = peopleOf(view);
  const host = view.hostId === view.meId;
  const rows: PodiumRow[] = match.standings.map((row) => {
    const who = person(row.userId);
    return {
      key: row.userId,
      name: who.name,
      avatar: who.avatar,
      score: row.score,
      isMe: who.isMe,
      place: row.place,
      detail: match.game === "five-questions" ? `${row.correct ?? 0} de 5` : row.averageMs ? `${row.averageMs} ms` : undefined,
    };
  });
  const winner = match.standings[0];
  const winnerName = winner ? (winner.userId === view.meId ? "Vos" : person(winner.userId).name) : "";
  const winnerDetail = !winner
    ? ""
    : match.game === "five-questions"
      ? `${winnerName === "Vos" ? "Acertaste" : `${winnerName} acertó`} ${winner.correct ?? 0} de 5`
      : `${winnerName === "Vos" ? "Largaste" : `${winnerName} largó`} en ${winner.averageMs ?? "—"} ms de promedio`;

  // A fanfare for whoever won, the score counting for the rest.
  const sounded = useRef(false);
  const mine = match.standings.find((row) => row.userId === view.meId);
  useEffect(() => {
    if (sounded.current || !mine) return;
    sounded.current = true;
    if (mine.place === 1 && mine.score > 0) playSoundLater(250, "record");
    else playSoundLater(250, "reveal", mine.score);
  }, [mine]);

  const act = (action: () => Promise<unknown>) => {
    setBusy(true);
    action().then(refresh, refresh).finally(() => setBusy(false));
  };
  const wins = view.group && view.wins ? { group: view.group, wins: view.wins.map((row) => ({ face: person(row.userId), wins: row.wins })) } : null;
  return (
    <BattlePodium
      game={GAMES[match.game]}
      rows={rows}
      winnerDetail={winnerDetail}
      host={host}
      hostName={person(view.hostId).name}
      history={wins}
      busy={busy}
      onRematch={() => act(() => battlesApi.start(view.id))}
      onOtherGame={() => act(() => battlesApi.backToLobby(view.id))}
      onLeave={onLeave}
    />
  );
}

/* ───────────── Sheets and messages ───────────── */

function Sheet({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[linear-gradient(180deg,rgba(90,97,128,.6),rgba(115,120,143,.75))]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-[430px] rounded-t-[28px] bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-ink-200" />
        <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">{title}</h2>
        <p className="mt-2 text-[15px] font-medium text-ink-700">{text}</p>
        <div className="mt-5 flex flex-col gap-2.5">{children}</div>
      </div>
    </div>
  );
}

function LeaveSheet({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <Sheet title="¿Salís de la batalla?" text="La partida sigue sin vos. Con el link podés volver a la sala, y jugás la próxima.">
      <Button size="md" onClick={onStay}>
        Seguir jugando
      </Button>
      <Button size="md" variant="neutral" onClick={onLeave}>
        Salir
      </Button>
    </Sheet>
  );
}

function Message({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <Screen clouds={CLOUDS}>
      <GroupsMessage title={title} face="wow">
        {text}
      </GroupsMessage>
      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">{children}</div>
    </Screen>
  );
}

function Problem({ kind, id, home }: { kind: BattleProblem; id: string; home: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const back = (
    <Button variant="secondary" size="md" href={home}>
      <House className="size-[18px]" strokeWidth={2.6} />
      Volver
    </Button>
  );
  if (kind === "not-in-battle") {
    // A group's battle takes its members back in; a loose one needs its link.
    const rejoin = () =>
      battlesApi.joinFromGroup(id).then(
        () => window.location.reload(),
        () => setError("Para volver, pedile el link a quien armó la batalla."),
      );
    return (
      <Message title="No estás en esta batalla" text={error ?? "Saliste de la sala, o te sacaron."}>
        <Button onClick={() => void rejoin()}>
          <Swords className="size-5" strokeWidth={2.4} />
          Volver a entrar
        </Button>
        {back}
      </Message>
    );
  }
  if (kind === "closed") {
    return (
      <Message title="La batalla terminó" text="Se fueron todos de la sala. ¡Armá otra cuando quieran!">
        {back}
      </Message>
    );
  }
  if (kind === "not-found") {
    return (
      <Message title="No encontramos la batalla" text="Revisá el link, o pedile uno nuevo a quien la armó.">
        {back}
      </Message>
    );
  }
  if (kind === "signed-out") {
    return (
      <Message title="Entrá a tu cuenta" text="Las batallas se juegan con tu cuenta.">
        <Button onClick={() => router.push(`/cuenta/entrar?volver=${encodeURIComponent(`/batalla/${id}`)}`)}>Entrar</Button>
      </Message>
    );
  }
  return (
    <Message title="Sin conexión" text="Estamos intentando de nuevo…">
      {back}
    </Message>
  );
}
