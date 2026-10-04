"use client";

import { topGroup, type WaterSortEvent } from "@repo/games";
import { Check, Hourglass, Info, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/games/chrome";
import { ActionButton } from "@/components/tubitos/ActionButton";
import { Board } from "@/components/tubitos/Board";
import { useWaterSortBoard } from "@/components/tubitos/use-board";
import { Screen } from "@/components/ui/Screen";
import { Toast } from "@/components/ui/Toast";
import { ApiError, battlesApi } from "@/lib/api";
import type { BattleView, TubitosBoardView, TubitosMatchView } from "@/lib/battle-types";
import { useMediaQuery } from "@/lib/hooks";
import { playSound } from "@/lib/sound";
import { boardLayout, liquidOf } from "@/lib/tubitos";
import { useServerTime } from "@/lib/use-battle";
import { BattleTubitosBoard, BattleTubitosTable, type TubitosTableRow } from "./BattleTubitos";
import { peopleOf } from "./faces";

type Props = { view: BattleView; match: TubitosMatchView; now: () => number; refresh: () => void; onExit: () => void };
type Mine = { moves: number; timeMs: number; points: number };

/**
 * Tubitos a la par on this phone: each board opens at the same moment on
 * every phone, in this player's own version; solving it sends its steps,
 * which the server replays. Between boards, the table.
 */
export function TubitosLive(props: Props) {
  const current = props.match.current;
  if (current) return <TubitosRound key={current.index} {...props} board={current} />;
  return <TubitosBetween {...props} />;
}

function TubitosRound({ view, match, board, now, refresh, onExit }: Props & { board: TubitosBoardView }) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const short = useMediaQuery("(max-height: 800px)");
  const time = useServerTime(now, 250);
  const person = peopleOf(view);
  const [toast, showToast] = useToast();
  const [startAt, setStartAt] = useState<number | null>(null);
  const [frozenMs, setFrozenMs] = useState<number | null>(null);
  const [result, setResult] = useState<Mine | null>(match.mine);
  const [failed, setFailed] = useState(false);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // The board opens at the server's time, on every phone at once; its clock starts then.
  const open = useEffectEvent(() => setStartAt(performance.now()));
  useEffect(() => {
    const id = window.setTimeout(() => open(), Math.max(0, board.opensAt - now()));
    return () => window.clearTimeout(id);
  }, [board.opensAt, now]);

  const timeNow = () => Math.round(performance.now() - (startAt ?? performance.now()));
  const timeUp = time > 0 && time >= board.answerUntil;
  const done = frozenMs !== null || result !== null;

  const send = (log: { events: WaterSortEvent[]; durationMs: number }, attempt = 0) => {
    battlesApi.solve(view.id, board.index, log).then(
      (response) => {
        setResult(response);
        refresh();
      },
      (error: unknown) => {
        // The server said no (late, or it already had it): it decides.
        if (error instanceof ApiError && error.status < 500) {
          if (error.code !== "already-played") setFailed(true);
          refresh();
          return;
        }
        if (attempt < 3) window.setTimeout(() => send(log, attempt + 1), 1_000 * (attempt + 1));
        else setFailed(true);
      },
    );
  };

  const play = useWaterSortBoard(
    { start: board.tubes, capacity: match.capacity, undos: match.undos, reduced, active: startAt !== null && !done && !timeUp, timeNow },
    {
      onSolved: (t, _moves, events) => {
        setFrozenMs(t);
        send({ events, durationMs: t });
      },
      onWin: () => playSound("levelUp"),
      showToast,
    },
  );

  // The board takes the room left between the line and the buttons.
  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setArea((current) => (current && Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const count = board.tubes.length;
  const layout = useMemo(() => (area ? boardLayout(count, { width: area.width, height: area.height, tablet: false, short }) : null), [area, count, short]);
  const smallest = useMemo(() => (area ? boardLayout(count, { width: area.width, height: 0, tablet: false, short }).height : 0), [area, count, short]);

  const round = match.rounds.find((one) => one.index === board.index);
  const solved = new Set(round?.solved ?? []);
  if (done) solved.add(view.meId);
  const missing = match.players.filter((id) => !solved.has(id) && id !== view.meId).map((id) => person(id).name);
  const lifted = play.selected !== null ? topGroup(play.tubes[play.selected]!) : null;
  const stuck = startAt !== null && !done && !timeUp && play.stuck;

  let line;
  if (toast) {
    line = (
      <Toast key={toast.key} tone={toast.tone} icon={toast.icon} className="animate-fade-in">
        {toast.text}
      </Toast>
    );
  } else if (failed) {
    line = (
      <Toast tone="danger" icon={<Hourglass className="size-3.5" strokeWidth={3} />}>
        No llegó a tiempo
      </Toast>
    );
  } else if (done) {
    const moves = result?.moves ?? play.moves;
    line = (
      <Toast tone="success" icon={<Check className="size-3.5" strokeWidth={3} />}>
        {missing.length === 0 ? `¡Resuelto en ${moves} movimientos!` : `¡Resuelto en ${moves}! Esperando a ${missing.length === 1 ? missing[0] : `${missing.length} más`}…`}
      </Toast>
    );
  } else if (timeUp) {
    line = (
      <Toast tone="danger" icon={<Hourglass className="size-3.5" strokeWidth={3} />}>
        Se terminó el tiempo
      </Toast>
    );
  } else if (stuck) {
    line = (
      <Toast tone="gold" icon={<Info className="size-3.5" strokeWidth={3} />}>
        Sin movimientos · deshacé o reiniciá
      </Toast>
    );
  } else {
    line = <p className="text-[15px] font-semibold text-ink-700">{startAt === null ? "¡Preparados!" : lifted ? `${liquidOf(lifted.color).name} · elegí dónde pasarlo` : "Tocá un tubo para levantarlo"}</p>;
  }

  return (
    <BattleTubitosBoard
      index={board.index}
      total={match.boardCount}
      leftMs={Math.max(0, board.answerUntil - (time || board.opensAt))}
      faces={match.players.map(person)}
      solved={solved}
      moves={result?.moves ?? play.moves}
      par={board.par}
      line={line}
      hint={short ? undefined : "Solo sobre el mismo color o en un tubo vacío"}
      onExit={onExit}
      actions={
        <>
          <ActionButton onClick={play.undo} off={play.undosLeft === 0 || play.history.length === 0} breathe={stuck && play.history.length > 0 && play.undosLeft > 0}>
            <Undo2 className="size-5" strokeWidth={2.6} />
            Deshacer
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-surface-2 px-1.5 text-sm tabular-nums">{play.undosLeft}</span>
          </ActionButton>
          <ActionButton onClick={play.restart} breathe={stuck}>
            <RotateCcw className="size-5" strokeWidth={2.6} />
            Reiniciar
          </ActionButton>
        </>
      }
    >
      <div ref={areaRef} className="relative min-h-0 flex-1 px-5" style={{ minHeight: smallest || undefined }}>
        {layout && (
          <Board
            layout={layout}
            tubes={play.tubes}
            capacity={match.capacity}
            selected={play.selected}
            targets={play.targets}
            refused={play.refused}
            nudged={play.nudged}
            pour={play.pour}
            faded={play.faded}
            reduced={reduced}
            onTap={play.tap}
          />
        )}
      </div>
    </BattleTubitosBoard>
  );
}

/** Between boards: the table of the one that closed, until the next one (or the podium). */
function TubitosBetween({ view, match, now, onExit }: Props) {
  const time = useServerTime(now, 250);
  const person = peopleOf(view);
  const last = match.rounds.at(-1);
  const results = new Map((last?.results ?? []).map((one) => [one.userId, one]));
  const mine = results.get(view.meId);

  // How it went for me, when the table shows.
  const sounded = useRef(-1);
  useEffect(() => {
    if (!last?.closed || sounded.current === last.index) return;
    sounded.current = last.index;
    playSound(mine?.solved ? "correct" : "timeUp");
  }, [last, mine]);

  // A moment before the first board comes.
  if (!last?.closed) return <Screen>{null}</Screen>;
  const rows: TubitosTableRow[] = match.standings.map((row) => {
    const one = results.get(row.userId);
    return {
      face: person(row.userId),
      place: row.place,
      total: row.score,
      result: one?.solved && one.moves !== null && one.timeMs !== null ? { moves: one.moves, timeMs: one.timeMs, points: one.points } : null,
    };
  });
  return <BattleTubitosTable index={last.index} total={match.boardCount} par={last.par} rows={rows} nextIn={Math.max(0, Math.ceil(((last.nextAt ?? time) - time) / 1000))} onExit={onExit} />;
}
