"use client";

import { addDays, crownTitle } from "@repo/shared";
import { ChevronLeft, Crown, Settings, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupBattleStrip, GroupBattleTab, useGroupBattles } from "@/components/battle/GroupBattles";
import { CrownBand, MeBar, Podium, RankingRow, daysLeftText, type RankedPlayer } from "@/components/ranking/Ranking";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/Segmented";
import { useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { groupsApi } from "@/lib/api";
import { crownNotices, rememberHolders, type HolderNow } from "@/lib/crown-watch";
import { formatDayMonth, formatNumber } from "@/lib/format";
import { rememberGroup } from "@/lib/last-group";
import { groupErrorText } from "@/lib/group-copy";
import type { CrownView, GroupDetail, GroupDetailResponse, StandingRow } from "@/lib/group-types";
import { useRequest } from "@/lib/use-request";
import { GroupEmblem } from "./Emblem";
import { InviteSheet } from "./InviteSheet";
import { CrownNotices, GroupsMessage } from "./parts";

const CLOUDS = ["-left-[60px] top-[260px] w-[170px] opacity-80", "-right-[70px] top-[150px] w-[190px] opacity-80"];

type View = "today" | "week" | "battles";

/** Ranking del grupo (design 34), with the invitation sheet (33), its live battle and the "Batallas" tab. */
export function GroupScreen({ id, invite, tab }: { id: string; invite: boolean; tab?: "battles" }) {
  const account = useAccount();
  const request = useRequest(account ? `grupo:${id}:${account.id}` : null, () => groupsApi.detail(id));
  // Largada races against the last group opened.
  const opened = request.data !== undefined;
  useEffect(() => {
    if (opened) rememberGroup(id);
  }, [opened, id]);
  if (account === undefined) return <Screen nav>{null}</Screen>;
  if (!account) {
    return (
      <Screen clouds={CLOUDS} nav>
        <GroupsMessage title="Entrá a tu cuenta">Los grupos se ven con tu cuenta.</GroupsMessage>
        <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
          <Button href={`/cuenta/entrar?volver=/grupos/${id}`}>Entrar</Button>
        </div>
        <BottomNav />
      </Screen>
    );
  }
  if (request.error && !request.data) {
    return (
      <Screen clouds={CLOUDS} nav>
        <div className="px-5">
          <IconButton label="Volver a mis grupos" href="/grupos">
            <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
          </IconButton>
        </div>
        <GroupsMessage title="No pudimos abrir el grupo" face="wow">
          {groupErrorText(request.error)}
        </GroupsMessage>
        <div className="mt-auto px-5 pt-6">
          <Button variant="secondary" size="md" onClick={request.reload}>
            Probar de nuevo
          </Button>
        </div>
        <BottomNav />
      </Screen>
    );
  }
  if (!request.data) return <Screen nav>{null}</Screen>;
  return <Loaded data={request.data} account={account} inviteOnOpen={invite} initialView={tab ?? "week"} onChange={request.replace} />;
}

const asPlayer = (row: StandingRow): RankedPlayer => ({ key: row.userId, name: row.username, avatar: row.avatar, score: row.score, isMe: row.isMe });

/** Last week's crown, at the top of the group on the new week. */
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

function Loaded({
  data,
  account,
  inviteOnOpen,
  initialView,
  onChange,
}: {
  data: GroupDetailResponse;
  account: PublicAccount;
  inviteOnOpen: boolean;
  initialView: View;
  onChange: (data: GroupDetailResponse) => void;
}) {
  const { group, week, today, standings, lastCrown } = data;
  const [view, setView] = useState<View>(initialView);
  const [inviting, setInviting] = useState(inviteOnOpen);
  const battles = useGroupBattles(group.id);
  const ranking = view !== "battles";
  const rows = view === "today" ? standings.today : standings.week;
  const played = rows.filter((row) => row.position !== null);
  const crowned = view === "week" && week.hasCrown;
  const me = rows.find((row) => row.isMe);

  // The live crown: tell what changed since this browser last looked.
  const holder = standings.week[0] && standings.week[0].score > 0 ? standings.week[0] : null;
  const holders = useMemo<HolderNow[]>(
    () => (week.hasCrown ? [{ groupId: group.id, groupName: group.name, holderId: holder?.userId ?? null, holderName: holder?.username ?? null }] : []),
    [week.hasCrown, group.id, group.name, holder?.userId, holder?.username],
  );
  const notices = useMemo(() => crownNotices(week.start, holders, account.id), [week.start, holders, account.id]);
  useEffect(() => rememberHolders(week.start, holders), [week.start, holders]);

  const updateGroup = useCallback((next: GroupDetail) => onChange({ ...data, group: next }), [data, onChange]);
  const closeInvite = useCallback(() => setInviting(false), []);

  const first = account.article === "la" ? "primera" : "primero";
  const leadBy = me?.position === 1 && played[1] ? me.score - played[1].score : null;
  const above = me?.position && me.position > 1 ? played[me.position - 2] : undefined;
  const period = view === "week" ? "esta semana" : "hoy";
  const meDetail = !me?.position
    ? `Todavía no jugaste ${period}`
    : me.position === 1
      ? leadBy === null
        ? `Vas ${first}`
        : `Vas ${first} por ${formatNumber(leadBy)}`
      : `A ${formatNumber((above?.score ?? 0) - me.score)} de ${above?.username ?? "el de arriba"}`;
  const showLastCrown = lastCrown && lastCrown.weekStart === addDays(week.start, -7);

  return (
    <Screen clouds={CLOUDS} nav>
      <header className="flex items-center gap-2.5 px-5">
        <IconButton label="Volver a mis grupos" href="/grupos">
          <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
        </IconButton>
        <GroupEmblem emblem={group.emblem} color={group.color} size={38} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[17px] leading-tight font-extrabold">{group.name}</h1>
          <p className="text-xs font-semibold text-ink-500">
            {group.memberCount} {group.memberCount === 1 ? "miembro" : "miembros"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviting(true)}
          className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-extrabold text-brand shadow-sm transition active:scale-95"
        >
          <UserPlus className="size-4" strokeWidth={2.6} />
          Invitar
        </button>
      </header>

      <div className="px-5 pt-3.5">
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
            { value: "battles", label: "Batallas" },
          ]}
        />
      </div>

      <CrownNotices notices={notices} />

      <GroupBattleStrip groupId={group.id} battles={battles} className="mt-3.5" />

      {view === "battles" && <GroupBattleTab battles={battles} />}

      {ranking && (
        <>
          {showLastCrown && <LastCrown crown={lastCrown} mine={lastCrown.winner.userId === account.id} />}
          {!week.hasCrown && view === "week" && (
            <p className="mx-5 mt-3 rounded-row bg-gold-soft px-3.5 py-2.5 text-[13px] leading-[1.4] font-bold text-gold-ink">
              La primera corona se entrega el lunes {formatDayMonth(week.firstCrownOn)}: gana quien más sume del lunes {formatDayMonth(addDays(week.firstCrownOn, -7))} al
              domingo {formatDayMonth(addDays(week.firstCrownOn, -1))}.
            </p>
          )}

          <div className="pt-5">
            <Podium top={[played[0], played[1], played[2]].map((row) => (row ? asPlayer(row) : undefined))} crowned={crowned} />
          </div>
          {played.length === 0 && (
            <p className="px-8 pt-3 text-center text-sm font-semibold text-ink-700">
              {view === "week" ? "Nadie jugó todavía esta semana. ¡Arrancá vos!" : "Nadie jugó todavía hoy. ¡Arrancá vos!"}
            </p>
          )}

          <ul className="flex flex-col gap-2 px-4 pt-3" aria-label="Ranking">
            {rows
              .filter((row) => row.position === null || row.position > 3)
              .map((row) => (
                <RankingRow key={row.userId} position={row.position} player={asPlayer(row)} />
              ))}
          </ul>
        </>
      )}

      <div className="flex flex-col items-center gap-3 px-5 pt-5">
        {ranking && played.length < 2 && (
          <Button variant="secondary" size="md" onClick={() => setInviting(true)}>
            <UserPlus className="size-[18px]" strokeWidth={2.6} />
            Invitá a alguien para competir
          </Button>
        )}
        <Link href={`/grupos/${group.id}/ajustes`} className="flex items-center gap-1.5 text-[13px] font-extrabold text-brand">
          <Settings className="size-4" strokeWidth={2.4} />
          Miembros y ajustes
        </Link>
      </div>
      {/* Room for the bar above the nav. */}
      <div aria-hidden className="h-[76px] shrink-0" />

      {me && ranking && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+100px)] z-30 mx-auto w-[calc(100%-32px)] max-w-[398px]">
          {crowned && me.position === 1 ? (
            <CrownBand
              title={leadBy === null ? `Tenés la corona: vas ${first}` : `Tenés la corona: vas ${first} por ${formatNumber(leadBy)}`}
              detail={`La corona del grupo se define el domingo · ${daysLeftText(week.start, today)}`}
            />
          ) : (
            <MeBar position={me.position} player={asPlayer(me)} detail={meDetail} />
          )}
        </div>
      )}

      {inviting && <InviteSheet group={group} onClose={closeInvite} onChanged={updateGroup} />}
      <BottomNav />
    </Screen>
  );
}
