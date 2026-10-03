"use client";

import { LogIn, Play, X } from "lucide-react";
import Link from "next/link";
import { Personaje } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { OneAttemptNotice } from "@/components/ui/OneAttemptNotice";
import { Screen } from "@/components/ui/Screen";
import { gameStyle, type GameTheme } from "@/lib/games";

interface GameIntroProps {
  game: GameTheme;
  practice: boolean;
  /** 1-based position among today's challenges. */
  position?: number;
  closeHref: string;
  starting: boolean;
  error?: string | null;
  onStart: () => void;
  /** Signed out on a browser that knows an account: offer to sign in so the challenge counts. */
  signInHint?: { username: string; href: string };
}

/** "Antes de empezar": hero tile with the mascot, how to play, two facts and the big Empezar button. */
export function GameIntro({ game, practice, position, closeHref, starting, error, onStart, signInHint }: GameIntroProps) {
  const onGold = game.colors.on !== "#FFFFFF";
  return (
    <Screen clouds={["-left-10 bottom-[90px] w-[220px] opacity-95"]} style={gameStyle(game)}>
      <div className="flex items-center justify-between px-5">
        <IconButton label="Volver" href={closeHref}>
          <X className="size-[18px]" strokeWidth={2.6} />
        </IconButton>
        <Chip>{practice ? "Práctica · no cuenta para la corona" : `Reto ${position} de 3`}</Chip>
      </div>

      <div
        className={cx(
          "relative mx-5 mt-[18px] flex items-end justify-between overflow-hidden rounded-hero px-5 pt-5",
          game.heroClass,
          onGold ? "text-ink" : "text-white",
        )}
        style={{ boxShadow: `0 16px 32px ${game.shadow.replace(/[\d.]+\)$/, ".3)")}` }}
      >
        <div aria-hidden className="absolute inset-0 bg-hero-glow" />
        <div className="relative pb-[22px]">
          <div
            className={cx(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em]",
              onGold ? "bg-ink/10" : "bg-white/22",
            )}
          >
            {game.kicker}
          </div>
          <h1 className="mt-2 font-display text-[32px] leading-[1.05] font-extrabold tracking-[-.02em]">
            {game.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
        </div>
        <div className="relative -mr-1 h-[144px] w-[124px] shrink-0">
          <div aria-hidden className="absolute top-[54%] left-1/2 size-[122px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/38" />
          <div className="relative mx-auto h-[144px] w-[120px] drop-shadow-[0_10px_14px_rgba(0,0,0,.28)]">
            <Personaje {...game.mascot} size={120} />
          </div>
        </div>
      </div>

      <p className="px-6 pt-[18px] text-base leading-[1.45] font-semibold">{game.howTo}</p>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        {game.facts.map(({ Icon, value, label }) => (
          <div key={value} className="flex items-center gap-2.5 rounded-row bg-white px-3.5 py-3 shadow-sm">
            <Icon className="size-5 shrink-0 text-(--game-dark)" strokeWidth={2.2} />
            <div>
              <div className="font-display text-base font-extrabold">{value}</div>
              <div className="text-[11px] font-semibold text-ink-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {!practice && <OneAttemptNotice />}

      <div className="mt-auto px-5 pt-3.5">
        {signInHint && (
          <Link href={signInHint.href} className="mb-3 flex items-center gap-2.5 rounded-row bg-white px-3.5 py-2.5 shadow-sm active:scale-[.98]">
            <LogIn className="size-4 shrink-0 text-brand" strokeWidth={2.6} />
            <span className="flex-1 text-[13px] leading-[1.35] font-bold">
              No entraste como {signInHint.username}: este reto no va a quedar en tu cuenta.
            </span>
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
