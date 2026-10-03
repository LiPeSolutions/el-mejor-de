"use client";

import { ChevronDown, Crown, Flag, Play, Trophy, Users, X } from "lucide-react";
import Link from "next/link";
import { Personaje } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { OneAttemptNotice } from "@/components/ui/OneAttemptNotice";
import { Screen } from "@/components/ui/Screen";
import { gameStyle, type GameTheme } from "@/lib/games";
import type { LargadaGridResponse } from "@/lib/largada-types";
import { Helmet } from "./Car";
import type { Racer } from "./field";

/*
 * Largada's "antes de empezar" (design 01): the grid of today, with the
 * cars that will race and the group's members who haven't raced yet.
 */

interface Props {
  game: GameTheme;
  practice: boolean;
  /** 1-based position among today's challenges. */
  position?: number;
  closeHref: string;
  starting: boolean;
  error?: string | null;
  onStart: () => void;
  /** Undefined while it loads; null when it couldn't be loaded (the race is against the clock then). */
  grid: LargadaGridResponse | null | undefined;
  field: Racer[];
  onGroup: (groupId: string) => void;
  signInHint?: { username: string; href: string };
}

const MAX_BOXES = 6;

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

interface BoxProps {
  number: number | null;
  name: string;
  /** Above the name: "El mejor de" for the ghost. */
  caption?: string;
  avatar: Racer["avatar"];
  crown?: boolean;
  me?: boolean;
  waiting?: boolean;
  /** The right column starts lower, like a starting grid. */
  lower?: boolean;
}

function Box({ number, name, caption, avatar, crown, me, waiting, lower }: BoxProps) {
  return (
    <li
      className={cx(
        "flex h-[54px] min-w-0 items-center gap-2 rounded-t-[12px] border-x-2 border-t-2 px-2.5",
        waiting ? "border-dashed border-white/30" : me ? "border-[#8FA2FF] bg-brand/30" : "border-white/45",
        lower && "mt-5",
      )}
    >
      <span className={cx("w-3 shrink-0 self-start pt-1.5 font-display text-[13px] font-extrabold", waiting ? "text-white/40" : "text-white/70")}>{number ?? ""}</span>
      <span className={cx("shrink-0", waiting && "opacity-50")}>
        <Helmet avatar={avatar} width={32} />
      </span>
      <span className="min-w-0 leading-tight">
        {caption && <span className="block truncate text-[11px] font-semibold text-white/60">{caption}</span>}
        <span className={cx("flex items-center gap-1 font-display text-[15px] font-extrabold", waiting ? "text-white/60" : "text-white")}>
          <span className="truncate">{name}</span>
          {crown && <Crown aria-label="tiene la corona" className="size-3.5 shrink-0 fill-gold text-gold" strokeWidth={2.2} />}
        </span>
        {waiting && <span className="block text-[11px] font-semibold text-white/55">todavía no</span>}
      </span>
    </li>
  );
}

/** The grid in two staggered columns, like Formula 1's. */
function Grid({ grid, field, onGroup }: { grid: LargadaGridResponse | null | undefined; field: Racer[]; onGroup: (groupId: string) => void }) {
  const waiting = grid?.waiting.slice(0, Math.max(0, MAX_BOXES - field.length)) ?? [];
  const boxes = [
    ...field.map((racer) => {
      // "El mejor de" over "Chivilcoy", so the place fits.
      const ghost = racer.ghost ? /^((?:El|La) mejor de) (.+)$/.exec(racer.name) : null;
      return { key: racer.key, number: racer.number, name: ghost?.[2] ?? racer.name, caption: ghost?.[1], avatar: racer.avatar, crown: racer.crown, me: racer.me, waiting: false };
    }),
    ...waiting.map((member, i) => ({ key: member.userId, number: field.length + i + 1, name: member.username, avatar: member.avatar, crown: false, me: false, waiting: true })),
  ];
  const groups = grid?.groups ?? [];
  return (
    <section className="mx-5 mt-4 rounded-card bg-[#3B4056] px-4 pt-3.5 pb-4 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-extrabold tracking-[.08em] text-white/75 uppercase">Parrilla de hoy</h2>
        {groups.length > 1 && grid?.group ? (
          <label className="relative flex min-w-0 items-center">
            <span className="sr-only">Grupo</span>
            <select
              value={grid.group.id}
              onChange={(event) => onGroup(event.target.value)}
              className="max-w-[180px] appearance-none truncate rounded-full bg-white/12 py-1 pr-7 pl-3 text-[13px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id} className="text-ink">
                  {group.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-2 size-4 text-white/80" strokeWidth={2.6} />
          </label>
        ) : (
          grid?.group && <span className="truncate text-[13px] font-bold text-white/80">{grid.group.name}</span>
        )}
      </div>
      {grid === undefined ? (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2" aria-label="Cargando la parrilla">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={cx("h-[54px] animate-pulse rounded-t-[12px] bg-white/10", i % 2 === 1 && "mt-5")} />
          ))}
        </ul>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {boxes.map(({ key, ...box }, i) => (
            <Box key={key} {...box} lower={i % 2 === 1} />
          ))}
        </ul>
      )}
      {grid !== undefined && !grid?.group && (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-[1.35] font-semibold text-white/80">
          <Users className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
          <span>
            <Link href="/grupos" className="font-extrabold text-white underline underline-offset-2">
              Armá un grupo
            </Link>{" "}
            para correr contra tus amigos.
          </span>
        </p>
      )}
    </section>
  );
}

export function LargadaIntro({ game, practice, position, closeHref, starting, error, onStart, grid, field, onGroup, signInHint }: Props) {
  const rivals = field.filter((racer) => !racer.me);
  const versus =
    rivals.length === 0
      ? "Hoy largás vos primero: corrés contra el reloj."
      : rivals[0]?.ghost
        ? `Hoy corrés contra ${lowerFirst(rivals[0].name)}.`
        : "Hoy corrés contra los tiempos que hizo tu grupo.";
  return (
    <Screen clouds={["-left-10 bottom-[90px] w-[220px] opacity-95"]} style={gameStyle(game)}>
      <div className="flex items-center justify-between px-5">
        <IconButton label="Volver" href={closeHref}>
          <X className="size-[18px]" strokeWidth={2.6} />
        </IconButton>
        <Chip>{practice ? "Práctica · no cuenta para la corona" : `Reto ${position} de 3`}</Chip>
      </div>

      <div className="relative mx-5 mt-[18px] flex h-[120px] items-center justify-between overflow-hidden rounded-hero bg-hero-reflejos px-5 text-white" style={{ boxShadow: `0 16px 32px ${game.shadow.replace(/[\d.]+\)$/, ".3)")}` }}>
        <div aria-hidden className="absolute inset-0 bg-hero-glow" />
        <div className="relative">
          <div className="inline-flex rounded-full bg-white/22 px-2.5 py-1 text-[11px] font-bold tracking-[.06em] uppercase">{game.kicker}</div>
          <h1 className="mt-1.5 font-display text-[36px] leading-none font-extrabold tracking-[-.02em]">{game.name}</h1>
        </div>
        <div className="relative -mr-2 h-[120px] w-[110px] shrink-0">
          <div aria-hidden className="absolute top-1/2 left-1/2 size-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/38" />
          <div className="relative mx-auto mt-[6px] drop-shadow-[0_10px_14px_rgba(0,0,0,.2)]">
            <Personaje {...game.mascot} size={92} />
          </div>
        </div>
      </div>

      <p className="px-6 pt-4 text-base leading-[1.45] font-semibold">Cuando se apaguen las cinco luces, tocá. {versus}</p>

      <div className="flex gap-2 px-5 pt-3">
        <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-bold shadow-sm">
          <Flag className="size-4 text-reflejos-dark" strokeWidth={2.4} />3 largadas
        </span>
        <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-bold shadow-sm">
          <Trophy className="size-4 text-reflejos-dark" strokeWidth={2.4} />
          1.000 con 200 ms
        </span>
      </div>

      <Grid grid={grid} field={field} onGroup={onGroup} />

      {!practice && <OneAttemptNotice detail="Si te adelantás, perdés esa largada." />}

      <div className="mt-auto px-5 pt-3.5">
        {signInHint && (
          <Link href={signInHint.href} className="mb-3 flex items-center gap-2.5 rounded-row bg-white px-3.5 py-2.5 shadow-sm active:scale-[.98]">
            <span className="flex-1 text-[13px] leading-[1.35] font-bold">No entraste como {signInHint.username}: este reto no va a quedar en tu cuenta.</span>
            <span className="shrink-0 text-[13px] font-extrabold text-brand">Entrar</span>
          </Link>
        )}
        {error && (
          <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
            {error}
          </p>
        )}
        <Button variant="game" size="start" onClick={onStart} disabled={starting}>
          <Play className="size-5 fill-current" />
          {starting ? "Preparando…" : "Empezar"}
        </Button>
        <p className="mt-2 text-center text-xs font-semibold text-ink-700">{game.startNote}</p>
      </div>
    </Screen>
  );
}
