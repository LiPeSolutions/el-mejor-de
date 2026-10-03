"use client";

import { addDays, crownTitle, type PlaceLevel } from "@repo/shared";
import { Check, ChevronRight, Copy, Crown, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CrownNotices, GroupsMessage } from "@/components/groups/parts";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/Segmented";
import { brand } from "@/config/brand";
import { useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { placesApi } from "@/lib/api";
import { crownNotices, rememberHolders, type HolderNow } from "@/lib/crown-watch";
import { formatDayMonth, formatNumber } from "@/lib/format";
import type { CrownView } from "@/lib/group-types";
import { placePath } from "@/lib/paths";
import { gapText, placeErrorText } from "@/lib/place-copy";
import type { PlaceRankingRow, RankingLevelTab, RankingResponse } from "@/lib/place-types";
import type { TodayInfo } from "@/lib/today-types";
import { CrownBand, MeBar, Podium, RankingRow, daysLeftText, type RankedPlayer } from "./Ranking";

const CLOUDS = ["-left-[60px] top-[230px] w-[170px] opacity-80", "-right-[70px] top-[420px] w-[190px] opacity-80"];

type View = "today" | "week";

/**
 * Ranking (designs 24 and 25): the player's barrio or town, province and
 * country, today and this week, with each one's live crown.
 */
export function RankingScreen({ today, level }: { today: TodayInfo; level: PlaceLevel }) {
  const account = useAccount();
  if (account === undefined) return <Screen nav>{null}</Screen>;
  if (!account) return <SignedOut />;
  return <Rankings key={account.id} account={account} today={today} initialLevel={level} />;
}

function Title({ aside }: { aside?: string }) {
  return (
    <header className="flex items-baseline justify-between gap-3 px-5">
      <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">Ranking</h1>
      {aside && <p className="truncate text-xs font-semibold text-ink-500">{aside}</p>}
    </header>
  );
}

type Loaded = Partial<Record<PlaceLevel, { data?: RankingResponse; error?: unknown }>>;

/** Each level's ranking, kept while another loads so switching doesn't flash. */
function useRanking(level: PlaceLevel) {
  const [loaded, setLoaded] = useState<Loaded>({});
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    placesApi.ranking(level).then(
      (data) => alive && setLoaded((all) => ({ ...all, [level]: { data } })),
      (error: unknown) => alive && setLoaded((all) => ({ ...all, [level]: { data: all[level]?.data, error } })),
    );
    return () => {
      alive = false;
    };
  }, [level, round]);
  const levels = Object.values(loaded).find((one) => one?.data && one.data.levels.length > 0)?.data?.levels ?? [];
  return { ...loaded[level], levels, reload: () => setRound((value) => value + 1) };
}

const asPlayer = (row: PlaceRankingRow, level: PlaceLevel): RankedPlayer => ({
  key: row.userId,
  name: row.username,
  avatar: row.avatar,
  score: row.score,
  isMe: row.isMe,
  crown: row.holder,
  detail: level === "locality" ? undefined : row.locality,
});

const players = (count: number) => (count === 1 ? "1 jugador" : `${formatNumber(count)} jugadores`);

function Rankings({ account, today, initialLevel }: { account: PublicAccount; today: TodayInfo; initialLevel: PlaceLevel }) {
  const [level, setLevel] = useState<PlaceLevel>(initialLevel);
  const [view, setView] = useState<View>("today");
  const ranking = useRanking(level);
  const data = ranking.data;

  // The live crown: tell what changed since this browser last looked.
  const holder = data?.periods?.week.rows.find((row) => row.holder) ?? null;
  const holders = useMemo<HolderNow[]>(
    () =>
      data?.place && data.week.hasCrown && data.status === "ok"
        ? [{ groupId: `lugar:${data.place.id}`, groupName: data.place.crownName, holderId: holder?.userId ?? null, holderName: holder?.username ?? null }]
        : [],
    [data, holder?.userId, holder?.username],
  );
  const notices = useMemo(() => (data ? crownNotices(data.week.start, holders, account.id) : []), [data, holders, account.id]);
  useEffect(() => {
    if (data) rememberHolders(data.week.start, holders);
  }, [data, holders]);

  if (!data) {
    return (
      <Screen clouds={CLOUDS} nav>
        <Title />
        <LevelChips levels={ranking.levels} level={level} onChange={setLevel} />
        {ranking.error ? (
          <>
            <GroupsMessage title="No pudimos traer el ranking" face="wow">
              {placeErrorText(ranking.error)}
            </GroupsMessage>
            <div className="px-5 pt-6">
              <Button variant="secondary" size="md" onClick={ranking.reload}>
                Probar de nuevo
              </Button>
            </div>
          </>
        ) : (
          <div aria-label="Cargando el ranking" className="px-5 pt-4">
            <div className="h-10 animate-pulse rounded-full bg-white/60" />
            <div className="mt-5 grid grid-cols-3 items-end gap-2.5">
              {[140, 170, 125].map((height, i) => (
                <div key={i} className="animate-pulse rounded-t-2xl bg-white/50" style={{ height }} />
              ))}
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-[50px] animate-pulse rounded-row bg-white/60" />
              ))}
            </ul>
          </div>
        )}
        <BottomNav />
      </Screen>
    );
  }

  if (data.status === "no-place" || !data.place || !data.periods) return <NoPlace />;

  const { place, week, periods } = data;
  const period = view === "week" ? periods.week : periods.today;
  const rows = period.rows;
  const crowned = view === "week" && week.hasCrown;
  const me = rows.find((row) => row.isMe);
  const verified = data.status === "ok";
  const dayAside = today.dayNumber > 0 ? `Día ${today.dayNumber}` : "Hoy";
  const aside = `${view === "week" ? `Semana ${week.number}` : dayAside} · ${players(period.players)}`;
  const top = [1, 2, 3].map((position) => rows.find((row) => row.position === position));
  const rest = rows.filter((row) => row.position > 3);
  // Only the player played: design 25 instead of the list.
  const alone = period.players === 1 && me ? me : null;
  const lastCrownMine = data.lastCrown?.winner.userId === account.id;
  const where = view === "week" ? "esta semana" : "hoy";

  const mePlayer: RankedPlayer = me ? asPlayer(me, level) : { key: account.id, name: account.username, avatar: account.avatar, score: 0, isMe: true };
  const meDetail = me ? `${gapText(rows, me, account.article)}${data.me.verifiedThisWeek ? " · ubicación verificada" : ""}` : `Todavía no jugaste ${where}`;

  return (
    <Screen clouds={CLOUDS} nav>
      <Title aside={aside} />
      <LevelChips levels={data.levels} level={level} onChange={setLevel} />

      <div className="px-5 pt-3">
        <Segmented
          label="Período del ranking"
          value={view}
          onChange={setView}
          options={[
            { value: "today", label: "Hoy" },
            {
              value: "week",
              label: (
                <>
                  {week.hasCrown && <Crown className="size-[13px]" strokeWidth={2.6} />}
                  Semana {week.number}
                </>
              ),
            },
          ]}
        />
      </div>

      <CrownNotices notices={notices} />

      {!verified ? (
        <VerifyBanner
          text={
            <>
              Todavía no estás en este ranking. Verificá que estás en <b>{data.levels[0]?.name ?? place.name}</b> y entra todo lo que jugaste esta semana.
            </>
          }
        />
      ) : (
        week.hasCrown &&
        !data.me.verifiedThisWeek && <VerifyBanner text="Para pelear la corona de esta semana, verificá tu ubicación una vez." />
      )}
      {data.lastCrown && <LastCrown crown={data.lastCrown} mine={lastCrownMine} />}
      {!week.hasCrown && view === "week" && (
        <p className="mx-5 mt-3 rounded-row bg-gold-soft px-3.5 py-2.5 text-[13px] leading-[1.4] font-bold text-gold-ink">
          La primera corona de {place.crownName} se entrega el lunes {formatDayMonth(week.firstCrownOn)}: gana quien más sume del lunes{" "}
          {formatDayMonth(addDays(week.firstCrownOn, -7))} al domingo {formatDayMonth(addDays(week.firstCrownOn, -1))}.
        </p>
      )}

      <div className="pt-5">
        <Podium top={top.map((row) => (row ? asPlayer(row, level) : undefined))} crowned={crowned} />
      </div>
      {rows.length === 0 && (
        <p className="px-8 pt-3 text-center text-sm font-semibold text-ink-700">
          Nadie jugó todavía {where} en {place.name}. ¡Arrancá vos!
        </p>
      )}

      {alone ? (
        <AloneCard placeName={place.name} crownName={place.crownName} account={account} crowned={crowned && alone.holder} period={where} />
      ) : (
        <ul className="flex flex-col gap-2 px-4 pt-3" aria-label="Ranking">
          {rest.map((row, i) => {
            const previous = i === 0 ? 3 : rest[i - 1]!.position;
            return (
              <RankingEntry key={row.userId} skipped={row.position > previous + 1}>
                <RankingRow
                  position={row.position}
                  player={asPlayer(row, level)}
                  note={crowned && row.holder ? <Crown aria-label="Tiene la corona" className="size-3.5 shrink-0 fill-gold text-gold-dark" strokeWidth={2.2} /> : undefined}
                />
              </RankingEntry>
            );
          })}
        </ul>
      )}

      {verified && (
        <>
          {/* Room for the bar above the nav. */}
          <div aria-hidden className="h-[76px] shrink-0" />
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+100px)] z-30 mx-auto w-[calc(100%-32px)] max-w-[398px]">
            {crowned && me?.holder ? (
              <CrownBand
                title={`Tenés la corona de ${place.crownName}`}
                detail={`${gapText(rows, me, account.article)} · se define el domingo · ${daysLeftText(week.start, data.today)}`}
              />
            ) : (
              <MeBar position={me?.position ?? null} player={mePlayer} detail={meDetail} />
            )}
          </div>
        </>
      )}
      <BottomNav />
    </Screen>
  );
}

/** One row, after a "···" when the ones in between aren't shown. */
function RankingEntry({ skipped, children }: { skipped: boolean; children: ReactNode }) {
  return (
    <>
      {skipped && (
        <li aria-hidden className="text-center font-display text-base leading-none font-extrabold tracking-[.2em] text-ink-300">
          ···
        </li>
      )}
      {children}
    </>
  );
}

/** Locality, province and country, plus the groups (design 24). */
function LevelChips({ levels, level, onChange }: { levels: readonly RankingLevelTab[]; level: PlaceLevel; onChange: (level: PlaceLevel) => void }) {
  return (
    <nav aria-label="Lugar del ranking" className="-mb-1 overflow-x-auto pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1.5 px-5">
        {levels.map((tab) => {
          const active = tab.level === level;
          return (
            <li key={tab.level}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(tab.level)}
                className={cx(
                  "flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-extrabold whitespace-nowrap transition active:scale-95",
                  active ? "bg-ink text-white" : "bg-white text-ink shadow-sm",
                )}
              >
                {tab.name}
              </button>
            </li>
          );
        })}
        <li>
          <Link
            href="/grupos"
            className="flex h-[34px] items-center gap-1 rounded-full bg-white px-3.5 text-[13px] font-extrabold whitespace-nowrap text-ink shadow-sm transition active:scale-95"
          >
            <Users className="size-3.5" strokeWidth={2.6} />
            Grupos
            <ChevronRight className="size-3.5 text-ink-500" strokeWidth={2.8} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function VerifyBanner({ text }: { text: ReactNode }) {
  return (
    <div className="mx-5 mt-3 flex items-center gap-3 rounded-row bg-white px-3.5 py-2.5 shadow-sm">
      <ShieldCheck className="size-5 shrink-0 text-brand" strokeWidth={2.4} />
      <p className="min-w-0 flex-1 text-[13px] leading-[1.35] font-semibold [&_b]:font-extrabold">{text}</p>
      <Link
        href={placePath({ verify: true, back: "/ranking" })}
        className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-[13px] font-extrabold text-white shadow-[0_6px_14px_rgba(79,107,255,.35)] transition active:scale-95"
      >
        Verificar
      </Link>
    </div>
  );
}

/** Last week's crown of this place, at the top on the new week. */
function LastCrown({ crown, mine }: { crown: CrownView; mine: boolean }) {
  const text = (
    <>
      <Crown className="size-[18px] shrink-0 fill-gold text-gold-dark" strokeWidth={2.2} />
      <span>
        Semana {crown.weekNumber}: {mine ? "vos fuiste" : `${crown.winner.username} fue`} {crownTitle(crown.title, crown.winner.article)} con{" "}
        {formatNumber(crown.score)} puntos.
      </span>
    </>
  );
  const className = "mx-5 mt-3 flex items-center gap-2.5 rounded-row bg-gold-soft px-3.5 py-2.5 text-[13px] leading-[1.35] font-bold text-gold-ink";
  return mine ? (
    <Link href={`/corona?id=${crown.id}`} className={className}>
      {text}
    </Link>
  ) : (
    <p className={className}>{text}</p>
  );
}

/** Design 25: the only one who played. The crown is theirs, with a little humor and an invitation. */
function AloneCard({
  placeName,
  crownName,
  account,
  crowned,
  period,
}: {
  placeName: string;
  crownName: string;
  account: PublicAccount;
  crowned: boolean;
  period: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  const only = account.article === "la" ? "la única" : "el único";
  const invite = `¿Me ganás? Jugá los retos de hoy y competí por ${crownName} en ${brand.name}: ${window.location.origin}`;
  const copy = () => {
    navigator.clipboard.writeText(invite).then(
      () => setCopied(true),
      () => undefined,
    );
  };
  return (
    <section className="mx-5 mt-4 rounded-card bg-white px-4 py-4 shadow-md">
      <h2 className="font-display text-xl leading-[1.15] font-extrabold tracking-[-.01em] text-balance">
        {crowned ? `Sos ${crownTitle(crownName, account.article)}… porque sos ${only}.` : `Por ahora sos ${only} de ${placeName} que jugó ${period}.`}
      </h2>
      <p className="mt-1.5 text-[13px] leading-[1.45] font-semibold text-ink-700">
        {crowned ? "La corona es tuya igual, pero gana más gracia con competencia. ¿Te animás a invitar a alguien?" : "Con competencia la corona vale más. ¿Te animás a invitar a alguien?"}
      </p>
      <div className="mt-3.5 flex flex-col gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(invite)}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-whatsapp font-display text-[15px] font-extrabold text-white shadow-[0_10px_20px_rgba(37,211,102,.3)] transition active:scale-[.98]"
        >
          <MessageCircle className="size-[18px]" strokeWidth={2.6} />
          Invitar por WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-surface-2 text-[13px] font-extrabold text-ink-700 transition active:scale-[.98]"
        >
          {copied ? <Check className="size-4 text-success" strokeWidth={3} /> : <Copy className="size-4" strokeWidth={2.6} />}
          {copied ? "¡Copiado!" : `Copiar link de ${placeName}`}
        </button>
      </div>
    </section>
  );
}

function NoPlace() {
  return (
    <Screen clouds={CLOUDS} nav>
      <Title />
      <GroupsMessage title="Elegí tu lugar">
        Para competir con tu barrio o tu pueblo, tu provincia y el país, contanos de dónde sos. Con tu ubicación es un toque.
      </GroupsMessage>
      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
        <Button href={placePath({ back: "/ranking" })}>
          <MapPin className="size-5" strokeWidth={2.6} />
          Elegir mi lugar
        </Button>
        <Button variant="secondary" size="md" href="/grupos">
          Ir a mis grupos
        </Button>
      </div>
      <BottomNav />
    </Screen>
  );
}

function SignedOut() {
  return (
    <Screen clouds={CLOUDS} nav>
      <Title />
      <GroupsMessage title="¿Sos el mejor de tu pueblo?">
        Creá tu cuenta para entrar al ranking de tu barrio o tu pueblo, tu provincia y el país, y pelear la corona de cada semana.
      </GroupsMessage>
      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
        <Button href="/cuenta/crear?volver=/ranking">Crear mi cuenta</Button>
        <Button variant="secondary" size="md" href="/cuenta/entrar?volver=/ranking">
          Ya tengo cuenta
        </Button>
      </div>
      <BottomNav />
    </Screen>
  );
}
