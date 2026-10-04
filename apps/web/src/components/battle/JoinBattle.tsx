"use client";

import { Swords } from "lucide-react";
import { Personaje, type PersonajeProps } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { gameStyle, type GameTheme } from "@/lib/games";
import { BATTLE_HOW_TO, FaceTile, LiveDot, Mascot, type BattleFace } from "./parts";

interface Props {
  host: { name: string; look: Pick<PersonajeProps, "sp" | "c" | "acc"> };
  game: GameTheme;
  players: readonly BattleFace[];
  /** Without an account the link first creates one, like the groups. */
  signedIn: boolean;
  playing: boolean;
  onJoin: () => void;
  joining?: boolean;
  error?: string | null;
  createHref: string;
  signInHref: string;
  /** Before going to create the account or sign in: this browser remembers to join on the way back. */
  onAccount?: () => void;
}

/** The page behind a battle's link (/b/CODE): who invites, to what and who's in. */
export function JoinBattle({ host, game, players, signedIn, playing, onJoin, joining = false, error = null, createHref, signInHref, onAccount }: Props) {
  const onGold = game.colors.on !== "#FFFFFF";
  return (
    <Screen clouds={["-left-[60px] top-[90px] w-[190px] opacity-90", "-right-[70px] top-[300px] w-[200px] opacity-80"]} style={gameStyle(game)}>
      <div className="flex justify-center">
        <span className="flex h-[34px] items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-extrabold text-ink shadow-sm">
          <LiveDot />
          {playing ? "Jugando ahora" : "Batalla en vivo"}
        </span>
      </div>

      <div className="flex flex-col items-center px-8 pt-6 text-center">
        <div className="relative">
          <div aria-hidden className="absolute top-[54%] left-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
          <div className="relative">
            <Personaje {...host.look} size={120} face="joy" anim="float" />
          </div>
        </div>
        <h1 className="mt-5 font-display text-[28px] leading-[1.1] font-extrabold tracking-[-.02em]">{host.name} te invitó a una batalla</h1>
        <p className="mt-2 text-[15px] leading-[1.45] font-semibold text-ink-700">Se juega en vivo: todos a la vez, cada uno en su celu.</p>
      </div>

      <div className="relative mx-5 mt-5 flex items-center gap-3 overflow-hidden rounded-card bg-(--game) px-4 py-3.5 text-(--game-on) shadow-(--game-tile-shadow)">
        <span aria-hidden className={cx("absolute inset-0", onGold ? "bg-[linear-gradient(160deg,rgba(255,255,255,.4),rgba(255,255,255,0)_55%)]" : "bg-tile-shine")} />
        <div className="relative min-w-0 flex-1">
          <div className={cx("text-[11px] font-extrabold tracking-[.06em] uppercase", onGold ? "text-gold-ink" : "text-white/85")}>{game.kicker}</div>
          <div className="font-display text-[22px] leading-tight font-extrabold">{game.name}</div>
          {BATTLE_HOW_TO[game.id] && <p className={cx("mt-1 text-xs leading-snug font-bold", onGold ? "text-gold-ink" : "text-white/90")}>{BATTLE_HOW_TO[game.id]}</p>}
        </div>
        <Mascot look={game.mascot} size={60} className="relative -mr-1 -mb-1 shrink-0" />
      </div>

      <div className="mx-5 mt-3 rounded-card bg-white px-3 pt-3 pb-3.5 shadow-md">
        <div className="px-1 text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">En la sala · {players.length} de 10</div>
        <div className="mt-2.5 grid grid-cols-5 gap-y-3">
          {players.map((player) => (
            <FaceTile key={player.key} face={player} size={36} />
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
        {error && (
          <p role="alert" className="rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
            {error}
          </p>
        )}
        {signedIn ? (
          <Button onClick={onJoin} size="lg" disabled={joining}>
            <Swords className="size-5" strokeWidth={2.6} />
            {joining ? "Sumándote…" : playing ? "Entrar a la sala" : "Sumarme"}
          </Button>
        ) : (
          <>
            <Button href={createHref} size="lg" onClick={onAccount}>
              Crear mi cuenta y sumarme
            </Button>
            <Button href={signInHref} variant="secondary" size="md" onClick={onAccount}>
              Ya tengo cuenta
            </Button>
          </>
        )}
        <p className="pt-1 text-center text-xs font-semibold text-ink-500">{playing ? "Entrás en la próxima, cuando termine esta" : "No cuenta para el ranking ni la corona"}</p>
      </div>
    </Screen>
  );
}
