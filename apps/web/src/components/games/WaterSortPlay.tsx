"use client";

import {
  WATER_SORT_RULES,
  canLift,
  checkPour,
  colorsLeft,
  hasPours,
  isSolved,
  isTubeDone,
  moveLayers,
  topGroup,
  waterSortLevelPoints,
  type Board as Tubes,
  type WaterSortEvent,
} from "@repo/games";
import { toGameDate } from "@repo/shared";
import { Check, Info, RotateCcw, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BACK_MS, Board, FLY_MS, POUR_MS_PER_LAYER, TILT_MS, type Flash, type PourMotion } from "@/components/tubitos/Board";
import { LevelPills, LevelWin } from "@/components/tubitos/LevelWin";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { Toast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { StartView, WaterSortBoardView } from "@/lib/challenge-types";
import { GAMES } from "@/lib/games";
import { useMediaQuery } from "@/lib/hooks";
import { playSound, playSoundLater, vibrate } from "@/lib/sound";
import { savePracticeLevel } from "@/lib/storage";
import { boardLayout, clockText, liquidOf } from "@/lib/tubitos";
import { GameHeader, ScoreRow, useToast } from "./chrome";

/*
 * Tubitos (docs/diseno/handoff-tubitos, direction 1a "Probeta"): tap a tube
 * to lift it, tap another to pour into it. The daily challenge is three
 * levels in a row, each one revealed by the server once the one before is
 * solved; practice goes on level after level.
 */

type View = Extract<StartView, { game: "water-sort" }>;

/** What the server grades: each level's steps, and the receipt of the ones solved. */
export interface WaterSortAttemptLog {
  levels: Array<{ events: WaterSortEvent[]; durationMs: number; receipt?: string }>;
}

interface Props {
  view: View;
  token: string;
  practice: boolean;
  /** The daily challenge's place in the day: "Reto 2 de 3". */
  position?: number;
  /** Practice: the highest level solved before. */
  record: number | null;
  onProgress: (log: WaterSortAttemptLog) => void;
  onFinish: (log: WaterSortAttemptLog) => void;
  onExit: () => void;
}

interface SolvedLevel {
  level: number;
  moves: number;
  par: number;
  timeMs: number;
  undos: number;
  /** The daily challenge's, from the server (null while it answers). */
  points: number | null;
}

type Phase = "playing" | "won" | "ending";

/** After the last cork, the victory (§3). */
const VICTORY_AFTER_MS = 600;

export function WaterSortPlay({ view, token: firstToken, practice, position, record, onProgress, onFinish, onExit }: Props) {
  const game = GAMES["water-sort"];
  const router = useRouter();
  const { capacity, undos } = view;
  const short = useMediaQuery("(max-height: 800px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const tablet = useMediaQuery("(min-width: 768px) and (min-height: 1000px)");

  const [token, setToken] = useState(firstToken);
  const [board, setBoard] = useState<WaterSortBoardView>(view.board);
  const [practiceLevel, setPracticeLevel] = useState(view.practiceLevel ?? 1);
  const [tubes, setTubes] = useState<Tubes>(view.board.tubes);
  const [moves, setMoves] = useState(0);
  const [undosLeft, setUndosLeft] = useState(undos);
  const [history, setHistory] = useState<Array<{ from: number; to: number; amount: number }>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [refused, setRefused] = useState<Flash | null>(null);
  const [nudged, setNudged] = useState<Flash | null>(null);
  const [faded, setFaded] = useState<Flash | null>(null);
  const [pour, setPour] = useState<PourMotion | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [solved, setSolved] = useState<SolvedLevel[]>([]);
  const [best, setBest] = useState(record);
  const [round, setRound] = useState(0);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [frozenMs, setFrozenMs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  const areaRef = useRef<HTMLDivElement>(null);
  const events = useRef<WaterSortEvent[]>([]);
  const log = useRef<WaterSortAttemptLog>({ levels: [] });
  const receipt = useRef<Promise<string | null> | null>(null);
  const timers = useRef<number[]>([]);
  const flashes = useRef(0);

  const later = (run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  };
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // Each level's clock starts on its first frame.
  useEffect(() => {
    const id = requestAnimationFrame((time) => setStartAt(time));
    return () => cancelAnimationFrame(id);
  }, [round]);

  // The clock on screen, until the level is solved.
  useEffect(() => {
    if (phase !== "playing" || frozenMs !== null) return;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [phase, frozenMs]);
  const elapsed = frozenMs ?? (startAt === null ? 0 : Math.max(0, now - startAt));

  // The board takes the room left between the instructions and the buttons.
  const playing = phase !== "won";
  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!element || !playing) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setArea((current) => (current && Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [playing]);
  const count = tubes.length;
  const layout = useMemo(() => (area ? boardLayout(count, { width: area.width, height: area.height, tablet, short }) : null), [area, count, tablet, short]);
  // Never squeezed past its smallest: below that the page scrolls instead.
  const smallest = useMemo(() => (area ? boardLayout(count, { width: area.width, height: 0, tablet, short }).height : 0), [area, count, tablet, short]);

  const targets = useMemo(
    () => new Set(selected === null ? [] : tubes.flatMap((_, index) => (checkPour(tubes, selected, index, capacity).ok ? [index] : []))),
    [selected, tubes, capacity],
  );
  const stuck = phase === "playing" && !pour && !isSolved(tubes, capacity) && !hasPours(tubes, capacity);

  /** Marks some tubes for a moment (a shake, a fade). */
  const flash = (set: (update: (current: Flash | null) => Flash | null) => void, marked: number[], ms: number) => {
    flashes.current += 1;
    const next = { tubes: marked, key: flashes.current };
    set(() => next);
    later(() => set((current) => (current?.key === next.key ? null : current)), ms);
  };

  const levelLog = (durationMs: number): WaterSortAttemptLog => ({ levels: [...log.current.levels, { events: events.current, durationMs }] });
  const report = (durationMs: number) => {
    if (!practice) onProgress(levelLog(durationMs));
  };
  const timeNow = () => Math.round(performance.now() - (startAt ?? performance.now()));
  const canAct = phase === "playing" && !pour && startAt !== null && frozenMs === null;

  const tap = (index: number) => {
    if (!canAct) return;
    const tube = tubes[index];
    if (!tube) return;
    if (selected === null) {
      if (!canLift(tube, capacity)) {
        flash(setNudged, [index], 240);
        return;
      }
      setSelected(index);
      vibrate(10);
      return;
    }
    if (index === selected) {
      setSelected(null);
      return;
    }
    const check = checkPour(tubes, selected, index, capacity);
    if (!check.ok) {
      // It can't take it: the lifted one stays up, so another can be tried.
      flash(setRefused, [index], 600);
      showToast({
        tone: "danger",
        icon: <X className="size-3.5" strokeWidth={3} />,
        text: check.reason === "full" ? "Ahí no · ese tubo está lleno" : "Ahí no · solo sobre el mismo color",
      });
      playSound("fail");
      vibrate([15, 60, 15]);
      return;
    }
    pourInto(selected, index, check.amount);
  };

  const pourInto = (from: number, to: number, amount: number) => {
    const t = timeNow();
    const before = tubes;
    const after = moveLayers(before, from, to, amount);
    const color = topGroup(before[from]!)!.color;
    const madeIt = isSolved(after, capacity);
    events.current = [...events.current, { type: "pour", from, to, t }];
    setMoves(moves + 1);
    setHistory((steps) => [...steps, { from, to, amount }]);
    setSelected(null);
    if (madeIt) {
      setFrozenMs(t);
      levelSolved(t, moves + 1);
    } else {
      report(t);
    }
    const settle = () => afterPour(before, after, to, madeIt);
    if (reduced) {
      // No flight: the liquid just goes, with a short fade.
      setTubes(after);
      flash(setFaded, [from, to], 150);
      playSound("pour", amount);
      settle();
      return;
    }
    const pourMs = amount * POUR_MS_PER_LAYER;
    setPour({ from, to, amount, color, stage: "lift", before });
    later(() => setPour((current) => current && { ...current, stage: "tilt" }), FLY_MS - TILT_MS);
    later(() => {
      setPour((current) => current && { ...current, stage: "pour" });
      playSound("pour", amount);
    }, FLY_MS);
    later(() => {
      setTubes(after);
      setPour((current) => current && { ...current, stage: "back" });
      settle();
    }, FLY_MS + pourMs);
    later(() => setPour(null), FLY_MS + pourMs + BACK_MS);
  };

  const afterPour = (before: Tubes, after: Tubes, to: number, madeIt: boolean) => {
    if (isTubeDone(after[to]!, capacity) && !isTubeDone(before[to]!, capacity)) {
      playSound("cork");
      vibrate(25);
      const left = colorsLeft(after, capacity);
      if (left > 0) showToast({ tone: "success", icon: <Check className="size-3.5" strokeWidth={3} />, text: `¡Tubo listo! · faltan ${left}` });
    }
    if (madeIt) later(win, VICTORY_AFTER_MS);
  };

  /** The solving pour: the level goes to the server right away, so its clock stops now. */
  const levelSolved = (t: number, levelMoves: number) => {
    const used = undos - undosLeft;
    if (practice) {
      setSolved([{ level: practiceLevel, moves: levelMoves, par: board.par, timeMs: t, undos: used, points: null }]);
      return;
    }
    const played = { events: events.current, durationMs: t };
    log.current = { levels: [...log.current.levels, played] };
    events.current = [];
    const index = log.current.levels.length - 1;
    const level = board.level;
    setSolved((list) => [...list, { level, moves: levelMoves, par: board.par, timeMs: t, undos: used, points: null }]);
    onProgress(log.current);
    const local = waterSortLevelPoints(WATER_SORT_RULES.levels[index] ?? WATER_SORT_RULES.levels[0], board.par, levelMoves, t);
    const setPoints = (points: number) => setSolved((list) => list.map((entry) => (entry.level === level ? { ...entry, points } : entry)));
    receipt.current = api.solved(token, level, played, board.levelToken).then(
      (response) => {
        log.current = { levels: log.current.levels.map((entry, i) => (i === index ? { ...entry, receipt: response.receipt } : entry)) };
        onProgress(log.current);
        setPoints(response.points);
        return response.receipt;
      },
      () => {
        setPoints(local);
        return null;
      },
    );
  };

  const win = () => {
    if (practice) {
      const saved = savePracticeLevel(toGameDate(new Date()), practiceLevel);
      setBest(saved.isRecord ? practiceLevel : saved.previous);
      setPhase("won");
      playSound("levelUp");
      if (saved.isRecord) playSoundLater(700, "record");
      return;
    }
    if (board.level >= view.levels) {
      // The last one goes straight to the score, with its receipt if it comes in time.
      setPhase("ending");
      const waiting = receipt.current ?? Promise.resolve(null);
      void Promise.race([waiting, new Promise((resolve) => window.setTimeout(resolve, 3_000))]).then(() => onFinish(log.current));
      return;
    }
    setPhase("won");
    playSound("levelUp");
  };

  const startLevel = (next: WaterSortBoardView) => {
    setBoard(next);
    setTubes(next.tubes);
    setMoves(0);
    setUndosLeft(undos);
    setHistory([]);
    setSelected(null);
    setRefused(null);
    setNudged(null);
    setFaded(null);
    setPour(null);
    setFrozenMs(null);
    setStartAt(null);
    setNow(0);
    setError(null);
    events.current = [];
    receipt.current = null;
    setPhase("playing");
    setRound((current) => current + 1);
  };

  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      if (practice) {
        const response = await api.startPractice("tubitos", practiceLevel + 1);
        if (response.view.game !== "water-sort") throw new Error("not Tubitos");
        setToken(response.token);
        setPracticeLevel(response.view.practiceLevel ?? practiceLevel + 1);
        startLevel(response.view.board);
        return;
      }
      let proof = await (receipt.current ?? Promise.resolve(null));
      if (!proof) {
        // The level didn't reach the server: send it again.
        const played = log.current.levels.at(-1)!;
        const response = await api.solved(token, board.level, played, board.levelToken);
        log.current = { levels: log.current.levels.map((entry, i, all) => (i === all.length - 1 ? { ...entry, receipt: response.receipt } : entry)) };
        onProgress(log.current);
        proof = response.receipt;
      }
      const response = await api.nextBoard(token, board.level + 1, proof);
      startLevel(response.board);
    } catch {
      setError("No pudimos traer el nivel. Revisá tu conexión y probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    const step = history.at(-1);
    if (!canAct || undosLeft === 0 || !step) return;
    const t = timeNow();
    events.current = [...events.current, { type: "undo", t }];
    setTubes(moveLayers(tubes, step.to, step.from, step.amount));
    setHistory((steps) => steps.slice(0, -1));
    setUndosLeft(undosLeft - 1);
    setSelected(null);
    flash(setFaded, [step.from, step.to], 150);
    report(t);
  };

  const restart = () => {
    if (!canAct || moves === 0) return;
    const t = timeNow();
    events.current = [...events.current, { type: "restart", t }];
    setTubes(board.tubes);
    setMoves(0);
    setUndosLeft(undos);
    setHistory([]);
    setSelected(null);
    flash(
      setFaded,
      board.tubes.map((_, index) => index),
      150,
    );
    report(t);
  };

  // Practice just leaves; the daily challenge asks first (it counts as played).
  const exit = () => (practice ? router.push("/practicar") : onExit());

  if (phase === "won") {
    const last = solved.at(-1)!;
    return (
      <LevelWin
        game={game}
        practice={practice}
        position={position}
        level={practice ? practiceLevel : last.level}
        moves={last.moves}
        par={last.par}
        timeMs={last.timeMs}
        undosUsed={last.undos}
        undos={undos}
        points={last.points}
        record={best ?? practiceLevel}
        pills={practice ? undefined : { total: view.levels, moves: solved.map((level) => level.moves), current: last.level + 1 }}
        tablet={tablet}
        short={short}
        reduced={reduced}
        busy={busy}
        error={error}
        onNext={() => void next()}
        onBack={onExit}
        onRepeat={() => startLevel(board)}
      />
    );
  }

  const lifted = selected !== null ? topGroup(tubes[selected]!) : null;
  const instruction = pour || phase === "ending" ? null : lifted ? `${liquidOf(lifted.color).name} · elegí dónde pasarlo` : "Tocá un tubo para levantarlo";

  return (
    <Screen wide={tablet} clouds={["-left-[60px] bottom-[50px] w-[220px] opacity-70"]}>
      <GameHeader
        title={game.name}
        onClose={exit}
        right={
          <div className="flex h-[38px] items-center rounded-full bg-white px-3.5 font-display text-base font-extrabold shadow-[0_6px_16px_rgba(35,38,58,.08)]">
            Nivel {practice ? practiceLevel : board.level}
          </div>
        }
      />
      <ScoreRow scoreLabel="Movimientos" score={moves} label="Tiempo" value={<span className="tabular-nums">{clockText(elapsed)}</span>} className={short ? "pt-3" : undefined} />

      <div aria-live="polite" className="mt-2 flex h-[34px] items-center justify-center px-5">
        {toast ? (
          <Toast key={toast.key} tone={toast.tone} icon={toast.icon} className="animate-fade-in">
            {toast.text}
          </Toast>
        ) : stuck ? (
          <Toast tone="gold" icon={<Info className="size-3.5" strokeWidth={3} />}>
            Sin movimientos · deshacé o reiniciá
          </Toast>
        ) : (
          instruction && <p className="text-[15px] font-semibold text-ink-700">{instruction}</p>
        )}
      </div>

      <div ref={areaRef} className="relative min-h-0 flex-1 px-5" style={{ minHeight: smallest || undefined }}>
        {layout && (
          <Board
            layout={layout}
            tubes={tubes}
            capacity={capacity}
            selected={selected}
            targets={targets}
            refused={refused}
            nudged={nudged}
            pour={pour}
            faded={faded}
            reduced={reduced}
            onTap={tap}
          />
        )}
      </div>

      {!practice && <LevelPills total={view.levels} moves={solved.map((level) => level.moves)} current={board.level} className="px-5" />}

      <div className={cx("grid grid-cols-2", tablet ? "mx-auto mt-4 w-[480px] gap-3" : "gap-2.5 px-5 pt-3.5")}>
        <ActionButton onClick={undo} off={undosLeft === 0 || history.length === 0} breathe={stuck && history.length > 0 && undosLeft > 0}>
          <Undo2 className="size-5" strokeWidth={2.6} />
          Deshacer
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-surface-2 px-1.5 text-sm tabular-nums">{undosLeft}</span>
        </ActionButton>
        <ActionButton onClick={restart} breathe={stuck}>
          <RotateCcw className="size-5" strokeWidth={2.6} />
          Reiniciar
        </ActionButton>
      </div>
      {!short && <p className="px-5 pt-3 text-center text-[13px] font-semibold text-ink-700">Solo sobre el mismo color o en un tubo vacío</p>}
    </Screen>
  );
}

/** The two white buttons under the board: dimmed when there's nothing to undo, breathing when stuck. */
function ActionButton({ children, onClick, off = false, breathe }: { children: ReactNode; onClick: () => void; off?: boolean; breathe: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={off}
      className={cx(
        "flex h-14 items-center justify-center gap-[9px] rounded-full bg-white font-display text-[17px] font-extrabold shadow-[0_8px_20px_rgba(35,38,58,.08)] transition active:scale-[.98]",
        off && "opacity-45",
        breathe && "animate-breathe",
      )}
    >
      {children}
    </button>
  );
}
