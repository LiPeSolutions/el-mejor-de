"use client";

import { LARGADA_RULES } from "@repo/games";
import { DEFAULT_AVATAR, addDays, type Article, type Avatar } from "@repo/shared";
import { ChevronRight, Crown, Gamepad2, MessageCircle, RotateCcw, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { largadaApi } from "@/lib/api";
import type { ChallengeResult } from "@/lib/challenge-types";
import { rememberHolders } from "@/lib/crown-watch";
import { formatNumber } from "@/lib/format";
import { gameStyle, type GameTheme } from "@/lib/games";
import type { GroupPlayer } from "@/lib/group-types";
import { useClientValue } from "@/lib/hooks";
import { bestStart, ordinal, photoCaption, startsOf } from "@/lib/largada";
import { lastLargadaRace } from "@/lib/largada-session";
import type { LargadaGridResponse, LargadaStart } from "@/lib/largada-types";
import { lastGroupId } from "@/lib/last-group";
import { useRequest } from "@/lib/use-request";
import { Helmet } from "./Car";
import { raceField, type BotRule, type Racer } from "./field";
import { FinishPhoto, polaroidPng } from "./FinishPhoto";

/*
 * Largada's result (design 06): the score, the finish photo of the
 * player's best start, today's podium of the group and, when this race
 * took the group's crown, the gold strip. Then "Contale al grupo".
 */

type LargadaResultData = Extract<ChallengeResult, { version: "largada" }>;

interface DailyProps {
  practice: false;
  position: number;
  date: string;
  next: { href: string; label: string; note: string };
}

interface PracticeProps {
  practice: true;
  isRecord: boolean;
  previous: number | null;
  againHref: string;
}

type Props = { game: GameTheme; result: LargadaResultData } & (DailyProps | PracticeProps);

const CLOUDS = ["-left-[70px] top-[110px] w-[200px] opacity-95", "-right-[60px] top-[190px] w-[170px] opacity-95"];
const MAX_MS = LARGADA_RULES.maxReactionMs;
const NO_START: LargadaStart = { reactionMs: null, falseStart: false };
/** Chips under the podium: the 4th onwards and who didn't race. */
const MAX_CHIPS = 6;

interface Standing {
  key: string;
  name: string;
  avatar: Avatar;
  score: number;
  averageMs: number | null;
  at: number;
  me: boolean;
  crown: boolean;
}

/** Without the race saved (another phone): the rivals of today's grid who had raced before the player. */
function fieldFromGrid(grid: LargadaGridResponse, me: { userId: string | null; avatar: Avatar; article: Article }, bots: BotRule): Racer[] {
  const mine = grid.me?.at ?? Number.MAX_SAFE_INTEGER;
  const lanes = grid.lanes.filter((id) => (grid.rivals.find((rival) => rival.userId === id)?.at ?? mine) < mine);
  return raceField({ ...grid, lanes }, me, bots);
}

/** Today's Largada in the group: by score, then the better average, then who raced first. */
function standings(grid: LargadaGridResponse, result: LargadaResultData, account: PublicAccount): Standing[] {
  const mine = grid.me;
  const rows: Standing[] = [
    ...grid.rivals.map((rival) => ({
      key: rival.userId,
      name: rival.username,
      avatar: rival.avatar,
      score: rival.score,
      averageMs: rival.averageMs,
      at: rival.at,
      me: false,
      crown: grid.crown?.userId === rival.userId,
    })),
    {
      key: account.id,
      name: "Vos",
      avatar: account.avatar,
      score: mine?.score ?? result.score,
      averageMs: mine?.averageMs ?? result.averageMs,
      at: mine?.at ?? Number.MAX_SAFE_INTEGER,
      me: true,
      crown: grid.crown?.userId === account.id,
    },
  ];
  return rows.sort((a, b) => b.score - a.score || (a.averageMs ?? 99_999) - (b.averageMs ?? 99_999) || a.at - b.at);
}

function praiseFor(score: number, name: string | null): string {
  if (score >= 700) return name ? `¡Qué reflejos, ${name}!` : "¡Qué reflejos!";
  if (score >= 400) return name ? `¡Bien, ${name}!` : "¡Bien!";
  return "¡Mañana sale mejor!";
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("mx-5 mt-3 rounded-card bg-white px-4 py-3.5 shadow-md", className)}>{children}</section>;
}

function CardTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="shrink-0 text-[11px] font-extrabold tracking-[.06em] text-ink-500 uppercase">{title}</h2>
      {aside && <span className="truncate text-xs font-bold text-ink-500">{aside}</span>}
    </div>
  );
}

const STEPS = {
  1: "h-[42px] bg-gold text-[22px] text-ink shadow-[0_8px_18px_rgba(255,197,61,.35)]",
  2: "h-[30px] bg-surface-2 text-lg text-ink-500",
  3: "h-[22px] bg-surface-2 text-base text-ink-500",
} as const;

function Step({ row, place }: { row: Standing; place: 1 | 2 | 3 }) {
  return (
    <li className="flex min-w-0 flex-col items-center">
      <Personaje {...avatarLook(row.avatar)} size={place === 1 ? 54 : 46} face={place === 1 ? "joy" : "happy"} />
      <div className={cx("mt-0.5 flex max-w-full items-center gap-1 text-[13px] font-extrabold", row.me && "text-brand")}>
        <span className="truncate">{row.name}</span>
        {row.crown && <Crown aria-label="tiene la corona" className="size-3.5 shrink-0 fill-gold text-gold-dark" strokeWidth={2.2} />}
      </div>
      <div className={cx("font-display text-[13px] leading-[1.2] font-extrabold tabular-nums", row.me ? "text-ink" : "text-ink-500")}>{formatNumber(row.score)}</div>
      <div
        className={cx("mt-1.5 grid w-full origin-bottom animate-grow place-items-center rounded-[12px_12px_6px_6px] font-display leading-none font-extrabold", STEPS[place])}
        style={{ animationDelay: `${300 + (3 - place) * 120}ms` }}
      >
        {place}
      </div>
    </li>
  );
}

type Extra = { kind: "row"; row: Standing; place: number } | { kind: "waiting"; member: GroupPlayer };

/** The 4th onwards and who didn't race; with too many, the player's own chip stays. */
function extrasFor(rest: readonly Standing[], waiting: readonly GroupPlayer[]): { shown: Extra[]; more: number } {
  const all: Extra[] = [...rest.map((row, i) => ({ kind: "row" as const, row, place: i + 4 })), ...waiting.map((member) => ({ kind: "waiting" as const, member }))];
  if (all.length <= MAX_CHIPS) return { shown: all, more: 0 };
  const shown = all.slice(0, MAX_CHIPS - 1);
  const mine = all.findIndex((extra) => extra.kind === "row" && extra.row.me);
  if (mine >= shown.length) shown[shown.length - 1] = all[mine]!;
  return { shown, more: all.length - shown.length };
}

function ExtraChip({ extra }: { extra: Extra }) {
  if (extra.kind === "waiting") {
    return (
      <li className="flex min-w-0 items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-ink-300 px-[7px] py-[5px]">
        <span className="opacity-50">
          <Helmet avatar={extra.member.avatar} width={25} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs leading-[1.15] font-extrabold text-ink-500">{extra.member.username}</span>
          <span className="block text-[11px] leading-[1.15] font-bold text-ink-500">no jugó</span>
        </span>
      </li>
    );
  }
  const { row, place } = extra;
  return (
    <li className={cx("flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5", row.me ? "bg-brand-100" : "bg-surface-2")}>
      <span className="font-display text-xs leading-none font-extrabold text-ink-500">{place}</span>
      <Helmet avatar={row.avatar} width={25} />
      <span className="min-w-0">
        <span className={cx("block truncate text-xs leading-[1.15] font-extrabold", row.me && "text-brand")}>{row.name}</span>
        <span className="block font-display text-xs leading-[1.15] font-extrabold text-ink-500 tabular-nums">{formatNumber(row.score)}</span>
      </span>
    </li>
  );
}

function GroupPodium({ rows, waiting, groupName }: { rows: readonly Standing[]; waiting: readonly GroupPlayer[]; groupName: string }) {
  const [first, second, third] = rows;
  const { shown, more } = extrasFor(rows.slice(3), waiting);
  return (
    <Card>
      <CardTitle title="Largada de hoy en el grupo" aside={groupName} />
      <ol className="mt-1.5 grid grid-cols-3 items-end gap-2" aria-label="Podio de hoy">
        {second ? <Step row={second} place={2} /> : <li aria-hidden />}
        {first && <Step row={first} place={1} />}
        {third ? <Step row={third} place={3} /> : <li aria-hidden />}
      </ol>
      {shown.length > 0 && (
        <>
          <div className="mt-3 mb-2.5 h-px bg-line" />
          <ul className="grid grid-cols-3 gap-1.5">
            {shown.map((extra) => (
              <ExtraChip key={extra.kind === "row" ? extra.row.key : extra.member.userId} extra={extra} />
            ))}
            {more > 0 && <li className="grid place-items-center rounded-xl bg-surface-2 px-2 py-1.5 text-xs font-extrabold text-ink-500">+{more} más</li>}
          </ul>
        </>
      )}
    </Card>
  );
}

/** Nobody else in the group raced today: the others will race against the player's times. */
function FirstOfGroup({ account, waiting, groupName }: { account: PublicAccount; waiting: readonly GroupPlayer[]; groupName: string }) {
  const { shown, more } = extrasFor([], waiting);
  return (
    <Card>
      <CardTitle title="Largada de hoy en el grupo" aside={groupName} />
      <div className="mt-2 flex items-center gap-3">
        <Personaje {...avatarLook(account.avatar)} size={50} face="joy" />
        <div className="min-w-0">
          <div className="font-display text-lg leading-tight font-extrabold">Sos {account.article === "la" ? "la primera" : "el primero"} del grupo hoy</div>
          <div className="mt-0.5 text-[13px] leading-[1.35] font-semibold text-ink-700">Cuando larguen, van a correr contra tus tiempos.</div>
        </div>
      </div>
      {shown.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-1.5">
          {shown.map((extra) => (
            <ExtraChip key={extra.kind === "row" ? extra.row.key : extra.member.userId} extra={extra} />
          ))}
          {more > 0 && <li className="grid place-items-center rounded-xl bg-surface-2 px-2 py-1.5 text-xs font-extrabold text-ink-500">+{more} más</li>}
        </ul>
      )}
    </Card>
  );
}

/** The three starts, when there's no podium: practice, or no group. */
function Starts({ starts, best, against, hint }: { starts: readonly LargadaStart[]; best: number | null; against?: string; hint?: ReactNode }) {
  return (
    <Card>
      <CardTitle title="Tus largadas" aside={against} />
      <ol className="mt-2 flex gap-1.5">
        {starts.map((start, i) => {
          const lost = start.reactionMs === null;
          return (
            <li
              key={i}
              className={cx(
                "flex h-9 flex-1 items-center justify-center rounded-xl font-display text-[13px] font-extrabold tabular-nums",
                lost ? "bg-danger/12 text-danger" : start.reactionMs === best ? "bg-reflejos text-white" : "bg-surface-2",
              )}
            >
              {start.falseStart ? "Se adelantó" : lost ? "No largó" : `${start.reactionMs} ms`}
            </li>
          );
        })}
      </ol>
      {hint && <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-[1.35] font-semibold text-ink-700">{hint}</p>}
    </Card>
  );
}

export function LargadaResult(props: Props) {
  const { game, result } = props;
  const account = useAccount();
  const userId = account?.id ?? null;
  const article: Article = account?.article ?? "el";
  const date = props.practice ? undefined : props.date;
  const saved = useClientValue(
    () => ({ race: lastLargadaRace(props.practice ? "practice" : "daily", userId, date), lastGroup: lastGroupId(), origin: window.location.origin }),
    `${props.practice}:${userId}:${date}`,
  );
  const race = saved?.race ?? null;
  const groupId = race ? (race.group?.id ?? null) : (saved?.lastGroup ?? null);
  // The podium and the crown are the daily challenge's; without the race saved, the photo needs the grid too.
  const wantsGrid = saved !== null && account !== undefined && ((!props.practice && account !== null) || !race);
  const grid = useRequest(wantsGrid ? `largada:${groupId ?? ""}:${userId ?? ""}` : null, () => largadaApi.grid(groupId));

  const mine = startsOf(result);
  const me = { userId, avatar: account?.avatar ?? DEFAULT_AVATAR, article };
  // The daily bots' times depend only on the day and the player, as when racing.
  const bots: BotRule = props.practice ? { mode: "fill", seed: "practica" } : { mode: "alone", seed: `${props.date}:${userId ?? "anon"}` };
  const field = race?.field ?? (grid.data ? fieldFromGrid(grid.data, me, bots) : grid.error ? raceField(null, me, bots) : null);
  const rivals = field?.filter((racer) => !racer.me) ?? [];
  const bestIndex = bestStart(mine, mine.map((_, i) => rivals.map((racer) => racer.starts[i] ?? NO_START)), MAX_MS) ?? 0;
  const lanes = field?.map((racer) => ({ racer, start: racer.me ? (mine[bestIndex] ?? NO_START) : (racer.starts[bestIndex] ?? NO_START) })) ?? null;
  const caption = lanes ? photoCaption(lanes.map(({ racer, start }) => ({ ...start, name: racer.name, me: racer.me })), MAX_MS, article) : "";
  const label = `Largada ${bestIndex + 1}`;

  const data = grid.data;
  const group = !props.practice && account && data?.group ? data.group : null;
  const rows = group && account && data ? standings(data, result, account) : null;
  const place = rows ? rows.findIndex((row) => row.me) + 1 : null;

  // "¡Le sacaste la corona a Tincho!": this race made the player the holder (the crown seen before it, the crown now).
  const crownGroup = !props.practice && account && data?.group && data.week.hasCrown && data.crown?.userId === account.id ? data.group : null;
  const strip =
    crownGroup && data && race?.group?.id === crownGroup.id && race.crown?.userId !== account?.id
      ? {
          title: race.crown ? `¡Le sacaste la corona a ${race.crown.username}!` : `¡La corona de ${crownGroup.name} es tuya!`,
          detail: `Vas ${ordinal(1, article)} en la semana${data.meWeek.lead ? ` por ${formatNumber(data.meWeek.lead)}` : ""} · ${addDays(data.week.start, 6) === date ? "se define hoy" : "se define el domingo"}`,
        }
      : null;
  const told = strip && data?.group && account ? `${data.week.start}:${data.group.id}:${data.group.name}` : null;
  useEffect(() => {
    if (!told || !account) return;
    const [week, groupId, ...name] = told.split(":");
    // Shown here: the group screens don't need to tell it again.
    rememberHolders(week!, [{ groupId: groupId!, groupName: name.join(":"), holderId: account.id, holderName: account.username }]);
  }, [told, account]);

  // The picture to share is drawn beforehand: the share sheet has to open right on the tap.
  const photo = useRef<SVGSVGElement>(null);
  const [picture, setPicture] = useState<{ key: string; file: File } | null>(null);
  const photoKey = lanes ? `${label}|${caption}|${lanes.map(({ racer, start }) => `${racer.key}:${start.reactionMs}:${start.falseStart}`).join(",")}` : null;
  useEffect(() => {
    const svg = photo.current;
    if (!svg || !photoKey) return;
    let alive = true;
    polaroidPng(svg, label, caption).then(
      (blob) => alive && blob && setPicture({ key: photoKey, file: new File([blob], "largada.png", { type: "image/png" }) }),
      () => {},
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `photoKey` sums up what the picture shows
  }, [photoKey]);
  const file = picture?.key === photoKey ? picture.file : null;

  const score = formatNumber(result.score);
  const shareText = group && place ? `Largada de hoy: ${score} · ${ordinal(place, article)} de ${group.name} 🏁 ¿Me ganás?` : `Largada de hoy: ${score} 🏁 ¿Me ganás?`;
  const message = `${shareText}\n${saved?.origin ?? ""}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const share = (event: MouseEvent<HTMLAnchorElement>) => {
    // With the picture, the share sheet; without it (or where it can't share files), the link opens WhatsApp.
    if (!file || !navigator.canShare?.({ files: [file] })) return;
    event.preventDefault();
    navigator.share({ files: [file], text: message }).catch((cause: unknown) => {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) window.open(whatsapp, "_blank", "noreferrer");
    });
  };

  let card: ReactNode = null;
  if (!props.practice && account && grid.loading && !data) {
    card = (
      <Card>
        <CardTitle title="Largada de hoy en el grupo" />
        <div className="mt-3 h-[150px] animate-pulse rounded-row bg-surface-2" />
      </Card>
    );
  } else if (rows && group && data) {
    card = rows.length > 1 ? <GroupPodium rows={rows} waiting={data.waiting} groupName={group.name} /> : <FirstOfGroup account={account!} waiting={data.waiting} groupName={group.name} />;
  } else {
    const ghost = rivals.find((racer) => racer.ghost);
    const bots = rivals.some((racer) => racer.bot);
    const versus = rivals.some((racer) => !racer.ghost && !racer.bot) ? "tu grupo" : ghost ? `${ghost.name.charAt(0).toLowerCase()}${ghost.name.slice(1)}` : null;
    const against = versus ? `contra ${versus}${bots ? " y los bots" : ""}` : bots ? "contra los bots" : undefined;
    const hint = props.practice ? undefined : (
      <>
        <Users className="mt-0.5 size-4 shrink-0 text-reflejos-dark" strokeWidth={2.4} />
        <span>
          <Link href="/grupos" className="font-extrabold text-brand">
            Armá un grupo
          </Link>{" "}
          y corré contra los tiempos de tus amigos.
        </span>
      </>
    );
    card = <Starts starts={mine} best={result.bestMs} against={against} hint={hint} />;
  }

  return (
    <Screen clouds={CLOUDS} style={gameStyle(game)}>
      <div className="flex justify-center px-5">
        <Chip className="whitespace-nowrap">
          {props.practice ? (
            <>
              <Gamepad2 className="size-4" strokeWidth={2.4} />
              Práctica · {game.name}
            </>
          ) : (
            <>
              <span className="inline-block size-2 rounded-full bg-(--game)" />
              Reto {props.position} de 3 · {game.name}
            </>
          )}
        </Chip>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_min(176px,43vw)] items-center gap-2.5 pr-5 pl-6">
        <div className="min-w-0">
          {props.practice && props.isRecord ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1.5 text-[11.5px] font-extrabold whitespace-nowrap shadow-[0_8px_18px_rgba(255,197,61,.4)]">
              <Sparkles className="size-3.5 shrink-0" strokeWidth={2.4} />
              ¡Nuevo récord!
            </div>
          ) : (
            <div className="truncate text-sm font-bold text-ink-500">{praiseFor(result.score, account?.username ?? null)}</div>
          )}
          <div className={cx("mt-0.5 font-display leading-none font-extrabold tracking-[-.05em] tabular-nums", result.score >= 1000 ? "text-[56px]" : "text-[72px]")}>
            <AnimatedNumber value={result.score} />
          </div>
          <div className="mt-1 font-display text-[15px] font-bold text-ink-500">de 1.000</div>
          {props.practice ? (
            props.previous !== null && <div className="mt-2 text-[12.5px] font-bold text-ink-700">Tu récord: {formatNumber(Math.max(props.previous, result.score))}</div>
          ) : (
            <ProgressBar value={result.score} className="mt-2.5" />
          )}
          <p className="mt-2.5 text-[12.5px] leading-[1.4] font-bold text-ink-700">
            Promedio {result.averageMs} ms
            <br />
            {result.bestMs === null ? "Ninguna largada válida" : `Mejor largada ${result.bestMs} ms`}
          </p>
        </div>

        <div className="animate-pop" style={{ animationDelay: "200ms" }}>
          <figure className="rotate-[4deg] rounded-[10px] bg-white px-[7px] pt-[7px] shadow-[0_14px_30px_rgba(35,38,58,.2)]">
            <div className="overflow-hidden rounded-[3px]">
              {lanes ? <FinishPhoto ref={photo} field={lanes} maxReactionMs={MAX_MS} /> : <div className="aspect-[318/306] animate-pulse bg-surface-2" />}
            </div>
            <figcaption className="flex min-h-[30px] flex-wrap items-center justify-between gap-x-1.5 px-0.5 py-1">
              <span className="text-[9.5px] font-extrabold tracking-[.06em] text-ink-500 uppercase">{label}</span>
              <span className="ml-auto text-right font-display text-[11.5px] leading-tight font-extrabold text-brand">{caption}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      {card}

      {strip && (
        <div className="mx-5 mt-3 flex animate-rise items-center gap-3 rounded-[18px] bg-gold px-3.5 py-3 shadow-btn-gold" style={{ animationDelay: "900ms" }} aria-live="polite">
          <div className="grid size-[38px] shrink-0 place-items-center rounded-xl bg-white/45">
            <Crown className="size-[22px] fill-ink text-ink" strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base leading-[1.2] font-extrabold">{strip.title}</div>
            <div className="mt-0.5 text-[12.5px] font-bold text-gold-ink">{strip.detail}</div>
          </div>
        </div>
      )}

      <div className="mt-auto px-5 pt-3.5">
        {props.practice ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="game" size="lg" href={props.againHref} shine={false}>
                <RotateCcw className="size-[18px]" strokeWidth={2.6} />
                Otra vez
              </Button>
              <Button variant="secondary" size="lg" href="/practicar">
                Volver
              </Button>
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-ink-700">Quedó en tus récords personales</p>
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              onClick={share}
              className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-whatsapp font-display text-lg font-extrabold text-white shadow-[0_12px_24px_rgba(37,211,102,.35)] transition active:scale-[.98]"
            >
              <MessageCircle className="size-5" strokeWidth={2.4} />
              {group ? (rows && rows.length === 1 ? "Desafiá al grupo" : "Contale al grupo") : "Compartí tu largada"}
            </a>
            <Button variant="secondary" size="md" href={props.next.href}>
              {props.next.label}
              <ChevronRight className="size-[18px]" strokeWidth={2.8} />
            </Button>
          </div>
        )}
      </div>
    </Screen>
  );
}
