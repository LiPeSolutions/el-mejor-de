"use client";

import { Calendar, Crown, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GroupsMessage } from "@/components/groups/parts";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { Button } from "@/components/ui/Button";
import { Cloud } from "@/components/ui/Cloud";
import { Screen } from "@/components/ui/Screen";
import { brand } from "@/config/brand";
import { useAccount } from "@/lib/account";
import { groupsApi, levelSlug } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { CrownView } from "@/lib/group-types";
import { shareOrCopy } from "@/lib/share";
import { playSoundLater } from "@/lib/sound";
import { useRequest } from "@/lib/use-request";

/** Confetti pieces: position, color, size and timing, fixed so every render matches. */
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  color: ["#FFC53D", "#FF6B4A", "#2EC4B6", "#8B6CFF", "#FFFFFF", "#FF7AA2"][i % 6],
  width: 7 + (i % 3) * 3,
  delay: -((i * 0.73) % 4.5),
  duration: 3.6 + (i % 4) * 0.5,
}));

/** "1ª", "2ª", "3ª"… */
const ordinal = (n: number) => `${n}ª`;

/** "El Mejor de Los primos" with the name apart, to paint it gold; a place's "la" goes with the lead ("de la Ciudad…"). */
function titleParts(crown: CrownView): { lead: string; name: string } {
  const lead = crown.winner.article === "la" ? "La Mejor" : "El Mejor";
  const withEl = /^el\s+(.+)$/i.exec(crown.title);
  if (withEl) return { lead: `${lead} del`, name: withEl[1]! };
  const withLa = crown.kind === "group" ? null : /^la\s+(.+)$/.exec(crown.title);
  return withLa ? { lead: `${lead} de la`, name: withLa[1]! } : { lead: `${lead} de`, name: crown.title };
}

/**
 * Festejo de corona (designs 28 and 29). Without `id` it shows the oldest
 * crown not seen yet; with one, that crown again (from the palmarés).
 */
export function CrownCelebration({ id }: { id?: string }) {
  const account = useAccount();
  const router = useRouter();
  const request = useRequest(account ? `coronas:${account.id}` : null, () => groupsApi.crowns());
  // Crowns already celebrated on this screen, to go on with the next one.
  const [done, setDone] = useState<string[]>([]);
  if (account === undefined || (account && !request.data && !request.error)) return <Screen backdrop="festejo">{null}</Screen>;
  const crowns = request.data?.crowns ?? [];
  const pending = [...crowns].reverse().filter((one) => !one.seen && !done.includes(one.id));
  const crown = id ? crowns.find((one) => one.id === id) : pending[0];
  if (!account || !crown) {
    return (
      <Screen>
        <GroupsMessage title={account ? "No hay coronas nuevas" : "Entrá a tu cuenta"} face="wow">
          {account ? "Cada lunes se corona a quien más sumó en cada lugar y en cada grupo. ¡Que la próxima sea tuya!" : "Las coronas se guardan en tu cuenta."}
        </GroupsMessage>
        <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
          <Button href="/">Ir a los retos de hoy</Button>
          <Button variant="secondary" size="md" href="/perfil">
            Ver mi palmarés
          </Button>
        </div>
      </Screen>
    );
  }
  const more = id ? 0 : pending.length - 1;
  const finish = () => {
    if (more > 0) setDone((ids) => [...ids, crown.id]);
    else router.replace(id ? "/perfil" : "/");
  };
  return <Celebration key={crown.id} crown={crown} more={more} replay={Boolean(id)} onDone={finish} />;
}

function Celebration({ crown, more, replay, onDone }: { crown: CrownView; more: number; replay: boolean; onDone: () => void }) {
  const [shared, setShared] = useState<string | null>(null);
  const { lead, name } = titleParts(crown);
  const look = avatarLook(crown.winner.avatar);

  // Seen once it's on screen: it won't open by itself again.
  useEffect(() => {
    if (!crown.seen) void groupsApi.crownSeen(crown.id).catch(() => undefined);
  }, [crown.id, crown.seen]);

  // Its fanfare, once per crown shown.
  const fanfare = useRef<string | null>(null);
  useEffect(() => {
    if (fanfare.current === crown.id) return;
    fanfare.current = crown.id;
    playSoundLater(300, "crown");
  }, [crown.id]);

  const share = async () => {
    const text = `👑 Soy ${lead} ${name} · Semana ${crown.weekNumber} · ${formatNumber(crown.score)} puntos en ${brand.name}. ¿Me la sacás?`;
    const outcome = await shareOrCopy(text);
    if (outcome === "copied") setShared("Copiado: pegalo donde quieras");
    else if (outcome === "failed") setShared("No pudimos compartir. Probá de nuevo.");
  };

  const diff = crown.runnerUp ? crown.score - crown.runnerUp.score : null;
  const versus =
    crown.runnerUp && diff !== null
      ? diff > 0
        ? `Le ganaste por ${formatNumber(diff)} a ${crown.runnerUp.username}`
        : `Empataste con ${crown.runnerUp.username}, pero llegaste ${crown.winner.article === "la" ? "primera" : "primero"}`
      : null;
  const alone = crown.players === 1;

  return (
    <Screen backdrop="festejo" className="pb-0">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className="absolute -top-6 block animate-rain rounded-[2px]"
            style={{
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.width * 0.6,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between px-5">
        <div className="flex h-[34px] items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[13px] font-bold">
          <Calendar className="size-3.5" strokeWidth={2.6} />
          {replay ? `Semana ${crown.weekNumber}` : `Lunes · cerró la Semana ${crown.weekNumber}`}
        </div>
        <button type="button" onClick={onDone} className="h-[34px] px-1 text-sm font-extrabold">
          {replay ? "Cerrar" : "Saltear"}
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-6 text-center">
        <div className="animate-pop drop-shadow-[0_18px_22px_rgba(20,28,90,.35)]">
          <Personaje {...look} acc={[...look.acc!, "corona"]} face="joy" size={170} anim="float" title={`El personaje de ${crown.winner.username}`} />
        </div>
        <p className="mt-4 text-[13px] font-extrabold tracking-[.08em] uppercase opacity-85">{crown.winner.username}</p>
        <h1 className="mt-1 font-display text-[40px] leading-[1.02] font-extrabold tracking-[-.03em] text-balance [overflow-wrap:anywhere]">
          ¡Sos {lead} <span className="text-gold">{name}</span>!
        </h1>
        <p className="mt-2 text-sm font-bold opacity-90">
          Semana {crown.weekNumber} · {formatNumber(crown.score)} puntos · {crown.daysPlayed} de 7 {crown.daysPlayed === 1 ? "día" : "días"}
        </p>
        {alone && (
          <p className="mt-2 text-sm leading-[1.4] font-semibold text-pretty opacity-90">
            …porque fuiste {crown.winner.article === "la" ? "la única" : "el único"} que jugó. ¿Te animás a invitar a alguien?
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {versus && <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-extrabold">{versus}</span>}
          <span className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-xs font-extrabold text-ink">
            <Crown className="size-3.5 fill-current" strokeWidth={2} />
            Tu {ordinal(crown.nth)} corona
          </span>
        </div>
      </div>

      {/* The buttons sit on white with clouds on top, so they and the last line read well. */}
      <div className="relative z-10 mt-auto pt-[110px]">
        <Cloud className="top-[10px] -left-[70px] w-[250px]" />
        <Cloud className="top-0 -right-[60px] w-[230px]" />
        <div className="relative flex flex-col gap-2.5 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          {shared && (
            <p role="status" className="text-center text-sm font-bold text-ink">
              {shared}
            </p>
          )}
          <Button variant="gold" size="gold" onClick={() => void share()}>
            <Share2 className="size-5" strokeWidth={2.6} />
            Compartir la corona
          </Button>
          {more > 0 ? (
            <Button variant="ghost" size="md" onClick={onDone} className="bg-brand-100 text-brand">
              {more === 1 ? "Ver tu otra corona" : `Ver tus otras ${more} coronas`}
            </Button>
          ) : crown.kind === "group" ? (
            crown.groupId && (
              <Button variant="ghost" size="md" href={`/grupos/${crown.groupId}`} className="bg-brand-100 text-brand">
                Ver el grupo
              </Button>
            )
          ) : (
            <Button variant="ghost" size="md" href={`/ranking?nivel=${levelSlug(crown.kind)}`} className="bg-brand-100 text-brand">
              Ver el ranking
            </Button>
          )}
          <p className="pt-1 text-center text-xs font-semibold text-ink-700">
            Ya quedó en tu palmarés · la Semana {crown.weekNumber + 1} arranca de cero
          </p>
        </div>
      </div>
    </Screen>
  );
}
