"use client";

import { ChevronLeft, LogOut, Pencil, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { groupsApi } from "@/lib/api";
import { groupErrorText } from "@/lib/group-copy";
import type { GroupDetailResponse, StandingRow } from "@/lib/group-types";
import { useRequest } from "@/lib/use-request";
import { GroupEmblem } from "./Emblem";
import { GroupsMessage } from "./parts";

type Confirm = { kind: "leave" } | { kind: "remove"; member: StandingRow };

/** Miembros y ajustes: the owner edits the group and removes members; anyone can leave. */
export function GroupSettings({ id }: { id: string }) {
  const account = useAccount();
  const request = useRequest(account ? `grupo:${id}:${account.id}` : null, () => groupsApi.detail(id));
  if (account === undefined || (account && !request.data && !request.error)) return <Screen>{null}</Screen>;
  if (!account || !request.data) {
    return (
      <Screen>
        <GroupsMessage title="No pudimos abrir el grupo" face="wow">
          {account ? groupErrorText(request.error) : "Entrá a tu cuenta para ver tus grupos."}
        </GroupsMessage>
        <div className="mt-auto px-5 pt-6">
          <Button variant="secondary" size="md" href="/grupos">
            Ver mis grupos
          </Button>
        </div>
      </Screen>
    );
  }
  return <Settings data={request.data} meId={account.id} reload={request.reload} />;
}

function Settings({ data, meId, reload }: { data: GroupDetailResponse; meId: string; reload: () => void }) {
  const router = useRouter();
  const { group } = data;
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const members = [...data.standings.week].sort((a, b) =>
    a.userId === group.ownerId ? -1 : b.userId === group.ownerId ? 1 : a.username.localeCompare(b.username, "es"),
  );
  const alone = members.every((member) => member.userId === meId);

  const run = async () => {
    if (!confirm) return;
    setSending(true);
    setError(null);
    try {
      if (confirm.kind === "leave") {
        await groupsApi.leave(group.id);
        router.replace("/grupos");
        return;
      }
      await groupsApi.remove(group.id, confirm.member.userId);
      setConfirm(null);
      setSending(false);
      reload();
    } catch (cause) {
      setError(groupErrorText(cause));
      setSending(false);
    }
  };

  return (
    <Screen>
      <div className="relative flex items-center justify-center px-5">
        <IconButton label="Volver al grupo" className="absolute left-5" href={`/grupos/${group.id}`}>
          <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
        </IconButton>
        <h1 className="font-display text-lg font-extrabold">Miembros y ajustes</h1>
      </div>

      <div className="mx-5 mt-4 flex items-center gap-3 rounded-card bg-white px-3.5 py-3 shadow-md">
        <GroupEmblem emblem={group.emblem} color={group.color} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-extrabold">{group.name}</div>
          <div className="text-xs font-semibold text-ink-500">
            {group.memberCount} de {group.maxMembers} miembros
          </div>
        </div>
        {group.isOwner && (
          <IconButton label="Cambiar nombre, emblema o color" href={`/grupos/${group.id}/editar`} className="bg-brand-100 text-brand shadow-none">
            <Pencil className="size-4" strokeWidth={2.6} />
          </IconButton>
        )}
      </div>

      <section className="px-5 pt-5">
        <Label>Miembros</Label>
        <ul className="mt-2 flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.userId} className="flex h-[54px] items-center gap-2.5 rounded-row bg-white pr-2 pl-3 shadow-sm">
              <Personaje {...avatarLook(member.avatar)} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {member.username}
                {member.isMe && <span className="text-ink-500"> (vos)</span>}
              </span>
              {member.userId === group.ownerId ? (
                <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-extrabold text-gold-ink">Administra</span>
              ) : (
                group.isOwner && (
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "remove", member })}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 text-xs font-extrabold text-ink-700 active:scale-95"
                  >
                    <UserMinus className="size-3.5" strokeWidth={2.6} />
                    Sacar
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto px-5 pt-6">
        <Button variant="secondary" size="md" onClick={() => setConfirm({ kind: "leave" })}>
          <LogOut className="size-[18px]" strokeWidth={2.6} />
          Salir del grupo
        </Button>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[linear-gradient(180deg,rgba(90,97,128,.6),rgba(115,120,143,.75))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-[430px] rounded-t-[28px] bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-ink-200" />
            <h2 id="confirm-title" className="font-display text-2xl font-extrabold tracking-[-.02em]">
              {confirm.kind === "leave" ? `¿Salís de ${group.name}?` : `¿Sacás a ${confirm.member.username}?`}
            </h2>
            <p className="mt-2 text-[15px] font-medium text-ink-700">
              {confirm.kind === "remove"
                ? "Deja de ver el grupo y sale del ranking. Va a poder volver solo con un link nuevo."
                : group.isOwner && !alone
                  ? "Lo va a administrar quien se sumó primero. Podés volver con un link de invitación."
                  : "Podés volver con un link de invitación."}
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-danger">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              <Button size="md" onClick={() => void run()} disabled={sending}>
                {sending ? "Un momento…" : confirm.kind === "leave" ? "Sí, salir del grupo" : `Sí, sacar a ${confirm.member.username}`}
              </Button>
              <Button
                variant="neutral"
                size="md"
                onClick={() => {
                  setConfirm(null);
                  setError(null);
                }}
                disabled={sending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
