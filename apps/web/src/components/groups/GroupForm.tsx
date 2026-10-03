"use client";

import { GROUP_COLORS, GROUP_EMBLEMS, GROUP_RULES, checkGroupName, crownTitle, type GroupColor, type GroupEmblem as EmblemId } from "@repo/shared";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Choices, TextField } from "@/components/account/fields";
import { Button } from "@/components/ui/Button";
import { Cloud } from "@/components/ui/Cloud";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { ApiError, groupsApi } from "@/lib/api";
import { groupErrorText, groupNameProblemText } from "@/lib/group-copy";
import type { GroupDetail } from "@/lib/group-types";
import { useRequest } from "@/lib/use-request";
import { EMBLEM_ICONS, EMBLEM_NAMES, GROUP_COLOR_NAMES, GROUP_COLOR_VALUES } from "./Emblem";
import { GroupsMessage } from "./parts";

const CLOUDS = ["-left-[60px] bottom-[150px] w-[200px] opacity-95"];

/** Crear un grupo (design 32), or change its name, emblem and color (`groupId`). */
export function GroupForm({ groupId }: { groupId?: string }) {
  const account = useAccount();
  const router = useRouter();
  const existing = useRequest(groupId && account ? `grupo:${groupId}` : null, () => groupsApi.detail(groupId!));
  if (account === undefined) return <Screen>{null}</Screen>;
  if (!account) {
    return (
      <Screen clouds={CLOUDS}>
        <GroupsMessage title="Primero, tu cuenta">Para armar un grupo necesitás una cuenta: es un apodo y una contraseña, sin email.</GroupsMessage>
        <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6">
          <Button href="/cuenta/crear?volver=/grupos/nuevo">Crear mi cuenta</Button>
          <Button variant="secondary" size="md" href="/cuenta/entrar?volver=/grupos/nuevo">
            Ya tengo cuenta
          </Button>
        </div>
      </Screen>
    );
  }
  if (!groupId) return <Form onSaved={(group) => router.replace(`/grupos/${group.id}?invitar=1`)} back="/grupos" />;
  if (existing.error) {
    return (
      <Screen clouds={CLOUDS}>
        <GroupsMessage title="No pudimos abrir el grupo" face="wow">
          {groupErrorText(existing.error)}
        </GroupsMessage>
        <div className="mt-auto px-5 pt-6">
          <Button variant="secondary" size="md" href="/grupos">
            Ver mis grupos
          </Button>
        </div>
      </Screen>
    );
  }
  if (!existing.data) return <Screen>{null}</Screen>;
  const group = existing.data.group;
  if (!group.isOwner) {
    return (
      <Screen clouds={CLOUDS}>
        <GroupsMessage title="Solo quien lo administra" face="wow">
          El nombre, el emblema y el color los cambia quien administra el grupo.
        </GroupsMessage>
        <div className="mt-auto px-5 pt-6">
          <Button variant="secondary" size="md" href={`/grupos/${group.id}`}>
            Volver al grupo
          </Button>
        </div>
      </Screen>
    );
  }
  return <Form initial={group} onSaved={() => router.replace(`/grupos/${group.id}`)} back={`/grupos/${group.id}`} />;
}

function Form({ initial, onSaved, back }: { initial?: GroupDetail; onSaved: (group: GroupDetail) => void; back: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [emblem, setEmblem] = useState<EmblemId>(initial?.emblem ?? "casa");
  const [color, setColor] = useState<GroupColor>(initial?.color ?? "azul");
  const [error, setError] = useState<{ name?: string; form?: string } | null>(null);
  const [sending, setSending] = useState(false);

  const checked = checkGroupName(name);
  const preview = checked.ok ? checked.name : name.trim() || "Tu grupo";
  const Icon = EMBLEM_ICONS[emblem];
  const tone = GROUP_COLOR_VALUES[color];

  const save = async () => {
    if (!checked.ok) {
      setError({ name: groupNameProblemText(checked.problem) });
      return;
    }
    setSending(true);
    setError(null);
    try {
      const fields = { name: checked.name, emblem, color };
      const { group } = initial ? await groupsApi.edit(initial.id, fields) : await groupsApi.create(fields);
      onSaved(group);
    } catch (cause) {
      const text = groupErrorText(cause);
      setError(cause instanceof ApiError && cause.code === "invalid-group-name" ? { name: text } : { form: text });
      setSending(false);
    }
  };

  return (
    <Screen clouds={CLOUDS}>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="relative flex items-center justify-center px-5">
          <IconButton label="Volver" className="absolute left-5" onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}>
            <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
          </IconButton>
          <h1 className="font-display text-lg font-extrabold">{initial ? "Editar grupo" : "Nuevo grupo"}</h1>
        </div>

        <div
          className="relative mx-5 mt-4 flex items-center gap-4 overflow-hidden rounded-hero px-[18px] py-5 shadow-hero"
          style={{ background: tone.fill, color: tone.on }}
        >
          <span aria-hidden className="absolute inset-0 bg-hero-glow" />
          <Cloud className="-right-[40px] -bottom-[40px] w-[170px] opacity-40" />
          <span className="relative grid size-16 shrink-0 place-items-center rounded-[20px] bg-white" style={{ color: tone.deep }}>
            <Icon className="size-8" strokeWidth={2.3} />
          </span>
          <div className="relative min-w-0">
            <div className="text-[11px] font-bold tracking-[.06em] uppercase opacity-85">Así se va a ver</div>
            <div className="mt-1 font-display text-[24px] leading-[1.05] font-extrabold tracking-[-.02em] [overflow-wrap:anywhere]">{crownTitle(preview)}</div>
          </div>
        </div>

        <TextField
          label="Nombre del grupo"
          value={name}
          onChange={(value) => {
            setName(value);
            setError(null);
          }}
          status={
            <span className="text-ink-500 tabular-nums">
              {name.trim().length} / {GROUP_RULES.nameMaxLength}
            </span>
          }
          error={error?.name}
          hint={'Por ejemplo "Los del laburo", "Los primos" o "5to B". Delante va "El Mejor de".'}
          maxLength={GROUP_RULES.nameMaxLength + 10}
          autoCapitalize="sentences"
          autoComplete="off"
        />

        <Choices
          label="Emblema"
          options={GROUP_EMBLEMS}
          value={emblem}
          onChange={setEmblem}
          rowClassName="grid grid-cols-4 gap-2"
          cellClassName="h-[52px] rounded-key"
          render={(option, selected) => {
            const OptionIcon = EMBLEM_ICONS[option];
            return {
              label: EMBLEM_NAMES[option],
              content: (
                <span className="grid size-full place-items-center rounded-key" style={selected ? { background: tone.fill, color: tone.on } : undefined}>
                  <OptionIcon className="size-[22px]" strokeWidth={2.3} />
                </span>
              ),
            };
          }}
        />

        <Choices
          label="Color"
          options={GROUP_COLORS}
          value={color}
          onChange={setColor}
          cellClassName="aspect-square max-w-[36px] rounded-full"
          render={(option) => ({
            label: GROUP_COLOR_NAMES[option],
            content: <span className="size-full rounded-full" style={{ background: GROUP_COLOR_VALUES[option].fill }} />,
          })}
        />

        <div className="mt-auto px-5 pt-6">
          {error?.form && (
            <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
              {error.form}
            </p>
          )}
          <Button type="submit" disabled={sending}>
            {sending ? (initial ? "Guardando…" : "Creando el grupo…") : initial ? "Guardar cambios" : "Crear el grupo"}
          </Button>
          {!initial && (
            <p className="mt-2 text-center text-xs font-semibold text-ink-700">Hasta {GROUP_RULES.maxMembers} miembros · vos lo administrás</p>
          )}
        </div>
      </form>
    </Screen>
  );
}
