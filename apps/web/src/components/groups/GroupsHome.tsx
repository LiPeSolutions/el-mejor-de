"use client";

import { inviteKey } from "@repo/shared";
import { ChevronRight, Crown, Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { badgeLook } from "@/components/personaje/avatar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { groupsApi } from "@/lib/api";
import { crownNotices, rememberHolders, type HolderNow } from "@/lib/crown-watch";
import { formatDayMonth, formatNumber } from "@/lib/format";
import { groupErrorText } from "@/lib/group-copy";
import type { GroupSummary, GroupWeek } from "@/lib/group-types";
import { useRequest } from "@/lib/use-request";
import { GroupEmblem } from "./Emblem";
import { CrownNotices, GroupsMessage } from "./parts";

const CLOUDS = ["-right-[60px] top-[120px] w-[180px] opacity-95", "-left-[50px] bottom-[200px] w-[220px] opacity-95"];

/** Mis grupos (design 31). */
export function GroupsHome() {
  const account = useAccount();
  if (account === undefined) return <Screen nav>{null}</Screen>;
  return account ? <MyGroups account={account} /> : <SignedOut />;
}

function Header({ action }: { action?: boolean }) {
  return (
    <header className="flex items-center justify-between px-5">
      <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">Grupos</h1>
      {action && (
        <Link
          href="/grupos/nuevo"
          aria-label="Crear un grupo"
          className="grid size-[38px] place-items-center rounded-full bg-brand text-white shadow-btn transition active:scale-95"
        >
          <Plus className="size-5" strokeWidth={2.8} />
        </Link>
      )}
    </header>
  );
}

/** "Va primera Juli · vos #3, a 310" (design 31). */
function standingText(group: GroupSummary, week: GroupWeek, account: PublicAccount): string {
  const { leader, me, gap } = group;
  if (!leader) return "Nadie sumó puntos todavía esta semana.";
  if (me.position === 1) {
    const first = account.article === "la" ? "primera" : "primero";
    const lead = gap === null ? `Vas ${first}` : `Vas ${first} por ${formatNumber(gap)}`;
    return week.hasCrown ? `${lead} · la corona se define el domingo` : lead;
  }
  const first = leader.article === "la" ? "primera" : "primero";
  const mine = me.position ? `vos #${me.position}, a ${formatNumber(gap ?? 0)}` : "vos todavía no jugaste";
  return `Va ${first} ${leader.username} · ${mine}`;
}

function GroupCard({ group, week, account }: { group: GroupSummary; week: GroupWeek; account: PublicAccount }) {
  const leading = group.me.position === 1;
  return (
    <li>
      <Link
        href={`/grupos/${group.id}`}
        className={cx("flex items-center gap-3 rounded-card bg-white py-3 pr-3.5 pl-3 shadow-md transition active:scale-[.99]", leading && "ring-2 ring-gold")}
      >
        <GroupEmblem emblem={group.emblem} color={group.color} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base leading-tight font-extrabold">{group.name}</div>
          <div className="text-xs font-semibold text-ink-500">
            {group.memberCount} {group.memberCount === 1 ? "miembro" : "miembros"} · Semana {week.number}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {group.leader && (
              <span className="shrink-0">
                <Personaje {...badgeLook(group.leader.avatar)} size={24} />
              </span>
            )}
            <span className="line-clamp-2 text-xs leading-[1.3] font-semibold text-ink-700">{standingText(group, week, account)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-0.5 font-display text-[26px] leading-none font-extrabold tabular-nums">
            {leading && week.hasCrown && <Crown className="size-[18px] fill-gold text-gold-dark" strokeWidth={2.2} />}
            {group.me.position ? `#${group.me.position}` : "–"}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-ink-500">de {group.memberCount}</div>
        </div>
      </Link>
    </li>
  );
}

/** "Tengo un código de invitación": opens the invitation page for that code. */
function CodeEntry() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mx-auto mt-3 flex items-center gap-1.5 text-[13px] font-extrabold text-brand">
        <Ticket className="size-4" strokeWidth={2.4} />
        Tengo un código de invitación
      </button>
    );
  }
  // The shortest code: a 3-letter word and 4 characters.
  const ready = inviteKey(code).length >= 7;
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) router.push(`/g/${code.toUpperCase().replace(/[^A-Z0-9-]/g, "")}`);
      }}
    >
      <label className="sr-only" htmlFor="invite-code">
        Código de invitación
      </label>
      <input
        id="invite-code"
        autoFocus
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="LABURO-7K2Q"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={24}
        className="h-[50px] min-w-0 flex-1 rounded-row border-2 border-transparent bg-white px-4 font-display text-lg font-extrabold tracking-[.06em] uppercase shadow-sm outline-none placeholder:text-ink-300 focus:border-brand"
      />
      <button
        type="submit"
        disabled={!ready}
        aria-label="Buscar el grupo"
        className="grid size-[50px] shrink-0 place-items-center rounded-row bg-brand text-white shadow-btn transition active:scale-95 disabled:opacity-45"
      >
        <ChevronRight className="size-5" strokeWidth={2.8} />
      </button>
    </form>
  );
}

function MyGroups({ account }: { account: PublicAccount }) {
  const { data, error, reload } = useRequest(`grupos:${account.id}`, () => groupsApi.list());

  // Who has each crown now, to tell the player what changed since last time.
  const holders = useMemo<HolderNow[]>(
    () =>
      data?.week.hasCrown
        ? data.groups.map((group) => ({ groupId: group.id, groupName: group.name, holderId: group.leader?.userId ?? null, holderName: group.leader?.username ?? null }))
        : [],
    [data],
  );
  const notices = useMemo(() => (data ? crownNotices(data.week.start, holders, account.id) : []), [data, holders, account.id]);
  useEffect(() => {
    if (data) rememberHolders(data.week.start, holders);
  }, [data, holders]);

  if (!data) {
    return (
      <Screen clouds={CLOUDS} nav>
        <Header />
        {error ? (
          <>
            <GroupsMessage title="No pudimos traer tus grupos" face="wow">
              {groupErrorText(error)}
            </GroupsMessage>
            <div className="px-5 pt-6">
              <Button variant="secondary" size="md" onClick={reload}>
                Probar de nuevo
              </Button>
            </div>
          </>
        ) : (
          <ul className="flex flex-col gap-2.5 px-5 pt-6" aria-label="Cargando tus grupos">
            {[0, 1].map((i) => (
              <li key={i} className="h-[92px] animate-pulse rounded-card bg-white/60" />
            ))}
          </ul>
        )}
        <BottomNav />
      </Screen>
    );
  }

  const { groups, week } = data;
  return (
    <Screen clouds={CLOUDS} nav>
      <Header action={groups.length > 0} />
      {groups.length === 0 ? (
        <>
          <GroupsMessage title="Armá tu primer grupo">
            Con tus amigos, tu familia o la gente del laburo: los mismos retos de cada día, su propio ranking y una corona cada semana.
          </GroupsMessage>
          <div className="mt-auto px-5 pt-6">
            <Button href="/grupos/nuevo">
              <Plus className="size-5" strokeWidth={2.8} />
              Crear un grupo
            </Button>
            <CodeEntry />
          </div>
        </>
      ) : (
        <>
          <p className="px-5 pt-2.5 text-sm leading-[1.4] font-semibold text-ink-700">
            Rankings privados con su propia corona. Los mismos retos, entre los tuyos.
          </p>
          {!week.hasCrown && (
            <p className="mx-5 mt-2.5 rounded-row bg-gold-soft px-3.5 py-2.5 text-[13px] leading-[1.4] font-bold text-gold-ink">
              La primera corona de los grupos se entrega el lunes {formatDayMonth(week.firstCrownOn)}: gana quien más sume esa semana.
            </p>
          )}
          <CrownNotices notices={notices} />
          <ul className="flex flex-col gap-2.5 px-5 pt-3.5">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} week={week} account={account} />
            ))}
          </ul>
          <div className="mt-auto px-5 pt-6">
            {groups.length < data.limits.maxGroups && (
              <Button href="/grupos/nuevo">
                <Plus className="size-5" strokeWidth={2.8} />
                Crear un grupo
              </Button>
            )}
            <CodeEntry />
          </div>
        </>
      )}
      <BottomNav />
    </Screen>
  );
}

function SignedOut() {
  return (
    <Screen clouds={CLOUDS} nav>
      <Header />
      <GroupsMessage title="Tu grupo, tu corona">
        Armá un grupo con tus amigos, tu familia o la gente del laburo, con su propio ranking y una corona cada semana. Para eso necesitás una cuenta.
      </GroupsMessage>
      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
        <Button href="/cuenta/crear?volver=/grupos">Crear mi cuenta</Button>
        <Button variant="secondary" size="md" href="/cuenta/entrar?volver=/grupos">
          Ya tengo cuenta
        </Button>
      </div>
      <BottomNav />
    </Screen>
  );
}

