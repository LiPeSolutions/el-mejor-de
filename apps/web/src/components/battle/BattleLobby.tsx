"use client";

import type { GameId } from "@repo/games";
import type { GroupColor, GroupEmblem as EmblemId } from "@repo/shared";
import { Check, Copy, MessageCircle, Play, Plus, Swords, X } from "lucide-react";
import { GroupEmblem } from "@/components/groups/Emblem";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { SoundToggle } from "@/components/ui/Sound";
import { gameStyle, type GameTheme } from "@/lib/games";
import { BATTLE_HOW_TO, FaceTile, Mascot, WaitingPill, type BattleFace } from "./parts";

export interface LobbyPlayer extends BattleFace {
  host: boolean;
  /** Their phone asked lately; if not, they show faded. */
  online?: boolean;
}

export interface GameChoice {
  game: GameTheme;
  /** Not playable in battles yet. */
  soon: boolean;
}

interface Props {
  group: { name: string; emblem: EmblemId; color: GroupColor } | null;
  game: GameTheme;
  choices: readonly GameChoice[];
  players: readonly LobbyPlayer[];
  maxPlayers: number;
  /** Whether the one looking is the host: they pick the game and start. */
  host: boolean;
  hostName: string;
  code: string;
  link: string;
  copied?: boolean;
  /** Waiting for the server after "Empezar". */
  starting?: boolean;
  error?: string | null;
  onPick: (game: GameId) => void;
  onStart: () => void;
  onInvite: () => void;
  onCopy: () => void;
  onLeave: () => void;
  /** The host taps someone (to take them out). */
  onPlayer?: (player: LobbyPlayer) => void;
}

function GameOption({ choice, selected, enabled, onPick }: { choice: GameChoice; selected: boolean; enabled: boolean; onPick: () => void }) {
  const { game, soon } = choice;
  const onGold = game.colors.on !== "#FFFFFF";
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!enabled || soon}
      aria-pressed={selected}
      style={gameStyle(game)}
      className={cx(
        "relative flex h-[84px] items-start overflow-hidden rounded-tile pt-3 pr-14 pl-3.5 text-left transition active:scale-[.98] disabled:active:scale-100",
        selected ? "bg-(--game) text-(--game-on) shadow-(--game-tile-shadow)" : "bg-white text-ink shadow-sm",
        soon && "opacity-55",
      )}
    >
      {selected && <span aria-hidden className={cx("absolute inset-0", onGold ? "bg-[linear-gradient(160deg,rgba(255,255,255,.4),rgba(255,255,255,0)_55%)]" : "bg-tile-shine")} />}
      <div className="relative min-w-0">
        <div className="font-display text-[15px] leading-[1.1] font-extrabold">
          {game.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </div>
        <div className={cx("mt-1 text-[11px] font-bold", selected ? (onGold ? "text-gold-ink" : "text-white/90") : "text-ink-500")}>
          {soon ? "Muy pronto" : game.kicker}
        </div>
      </div>
      <Mascot look={game.mascot} size={48} disc={selected ? "bg-white/40" : "bg-(--game-light)"} className="absolute right-1.5 -bottom-2" />
      {selected && (
        <span className={cx("absolute top-2 right-2 grid size-6 place-items-center rounded-full", onGold ? "bg-ink text-gold" : "bg-white text-(--game)")}>
          <Check className="size-3.5" strokeWidth={3.4} />
        </span>
      )}
    </button>
  );
}

/**
 * La sala: who's in, the game and the invitation. The host picks the game
 * and starts it for everyone; the others wait.
 */
export function BattleLobby({
  group,
  game,
  choices,
  players,
  maxPlayers,
  host,
  hostName,
  code,
  link,
  copied = false,
  starting = false,
  error = null,
  onPick,
  onStart,
  onInvite,
  onCopy,
  onLeave,
  onPlayer,
}: Props) {
  const enough = players.length >= 2;
  const free = maxPlayers - players.length;
  return (
    <Screen clouds={["-right-[70px] top-[120px] w-[190px] opacity-80", "-left-[60px] bottom-[150px] w-[200px] opacity-70"]}>
      <div className="flex items-center justify-between gap-2 px-5">
        <div className="flex gap-2">
          <IconButton label="Salir de la batalla" onClick={onLeave}>
            <X className="size-[18px]" strokeWidth={2.6} />
          </IconButton>
          <SoundToggle />
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <div className="text-[13px] font-extrabold tracking-[.06em] text-brand uppercase">Batalla en vivo</div>
          {group && (
            <div className="mt-0.5 flex max-w-[160px] items-center gap-1.5 text-xs font-bold text-ink-500">
              <GroupEmblem emblem={group.emblem} color={group.color} size={16} />
              <span className="truncate">{group.name}</span>
            </div>
          )}
        </div>
        <div className="flex min-w-[84px] justify-end">
          <span className="flex h-[34px] items-center rounded-full bg-white px-3 font-display text-[13px] font-extrabold tabular-nums shadow-sm">
            {players.length}/{maxPlayers}
          </span>
        </div>
      </div>

      <h1 className="px-5 pt-5 font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">{host ? "¿A qué jugamos?" : `${hostName} elige el juego`}</h1>
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-3.5">
        {choices.map((choice) => (
          <GameOption key={choice.game.id} choice={choice} selected={choice.game.id === game.id} enabled={host} onPick={() => onPick(choice.game.id)} />
        ))}
      </div>
      {BATTLE_HOW_TO[game.id] && <p className="px-6 pt-2.5 text-[13px] leading-snug font-semibold text-ink-700">{BATTLE_HOW_TO[game.id]}</p>}

      <div className="flex items-baseline justify-between px-5 pt-5">
        <Label>Jugadores</Label>
        <span className="text-xs font-bold text-ink-500">{free > 0 ? (free === 1 ? "Queda 1 lugar" : `Quedan ${free} lugares`) : "Sala llena"}</span>
      </div>
      <div className="mx-5 mt-2 grid grid-cols-5 gap-y-3 rounded-card bg-white px-2 py-3.5 shadow-md">
        {players.map((player) => {
          const tile = (
            <FaceTile
              face={player}
              size={38}
              dim={player.online === false}
              badge={
                player.host ? (
                  <span className="grid size-5 place-items-center rounded-full bg-brand text-white ring-2 ring-white" title="Arma la batalla">
                    <Swords className="size-3" strokeWidth={2.8} />
                  </span>
                ) : undefined
              }
            />
          );
          return host && onPlayer && !player.isMe ? (
            <button key={player.key} type="button" onClick={() => onPlayer(player)} aria-label={`Opciones de ${player.name}`} className="min-w-0">
              {tile}
            </button>
          ) : (
            <div key={player.key} className="min-w-0">
              {tile}
            </div>
          );
        })}
        {free > 0 && (
          <button type="button" onClick={onInvite} className="flex flex-col items-center gap-1">
            <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-ink-300 text-ink-500">
              <Plus className="size-5" strokeWidth={2.6} />
            </span>
            <span className="text-[11px] font-extrabold text-brand">Invitar</span>
          </button>
        )}
      </div>

      <div className="mx-5 mt-3 flex items-center gap-2.5">
        <div className="min-w-0 flex-1 rounded-row border-2 border-dashed border-ink-300 px-3.5 py-2">
          <div className="text-[10px] font-bold tracking-[.08em] text-ink-500 uppercase">Código</div>
          <div className="font-display text-[22px] leading-tight font-extrabold tracking-[.08em]">{code}</div>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`¡Vení a jugar ${game.name} conmigo, en vivo! ⚡\n${link}`)}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Invitar por WhatsApp"
          className="grid size-[52px] shrink-0 place-items-center rounded-full bg-whatsapp text-white shadow-[0_10px_20px_rgba(37,211,102,.3)]"
        >
          <MessageCircle className="size-6" strokeWidth={2.3} />
        </a>
        <button type="button" onClick={onCopy} aria-label="Copiar el link" className="grid size-[52px] shrink-0 place-items-center rounded-full bg-white text-ink-700 shadow-md">
          {copied ? <Check className="size-6 text-success" strokeWidth={2.8} /> : <Copy className="size-6" strokeWidth={2.3} />}
        </button>
      </div>
      {group && <p className="px-6 pt-2 text-xs font-semibold text-ink-500">Los de {group.name} ya ven el aviso en el grupo.</p>}

      <div className="mt-auto px-5 pt-5" style={gameStyle(game)}>
        {error && (
          <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
            {error}
          </p>
        )}
        {host ? (
          <>
            <Button variant="game" size="lg" onClick={onStart} disabled={!enough || starting} shine>
              <Play className="size-5 fill-current" />
              {starting ? "Arrancando…" : enough ? `Empezar · ${players.length} jugadores` : "Esperando jugadores"}
            </Button>
            <p className="pt-2.5 text-center text-xs font-semibold text-ink-500">{enough ? "Arranca para todos a la vez" : "Hacen falta 2 para empezar"}</p>
          </>
        ) : (
          <WaitingPill>Esperando a que {hostName} empiece…</WaitingPill>
        )}
      </div>
    </Screen>
  );
}
