"use client";

import { crownTitle, inviteKey } from "@repo/shared";
import { CalendarDays, Crown, House, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { ApiError, groupsApi } from "@/lib/api";
import { groupErrorText } from "@/lib/group-copy";
import type { InvitePreview } from "@/lib/group-types";
import { useRequest } from "@/lib/use-request";
import { GroupEmblem } from "./Emblem";
import { GroupsMessage } from "./parts";

const CLOUDS = ["-right-[60px] top-[90px] w-[180px] opacity-95", "-left-[50px] bottom-[180px] w-[220px] opacity-95"];

/*
 * Someone who opens an invitation without an account taps "Crear mi cuenta y
 * sumarme": this browser remembers it, and when they come back signed in the
 * page joins by itself. Only a tap here can start that.
 */
const PENDING_KEY = "emd:sumarme";

function pendingJoin(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function setPendingJoin(code: string | null): void {
  try {
    if (code) window.sessionStorage.setItem(PENDING_KEY, code);
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: they'll tap "Sumarme" once more.
  }
}

/** The page behind an invitation link (/g/LABURO-7K2Q). */
export function JoinGroup({ code }: { code: string }) {
  const account = useAccount();
  const request = useRequest(account === undefined ? null : `invitacion:${code}:${account?.id ?? ""}`, () => groupsApi.preview(code));
  if (account === undefined || (!request.data && !request.error)) return <Screen>{null}</Screen>;
  if (!request.data) {
    const notFound = request.error instanceof ApiError && request.error.status === 404;
    return (
      <Problem title={notFound ? "No encontramos este grupo" : "No pudimos abrir la invitación"}>
        {notFound ? "Revisá el link o el código, o pedile uno nuevo a quien te invitó." : groupErrorText(request.error)}
      </Problem>
    );
  }
  return <Invitation preview={request.data} signedIn={account !== null} code={code} />;
}

function Problem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen clouds={CLOUDS}>
      <GroupsMessage title={title} face="wow">
        {children}
      </GroupsMessage>
      <div className="mt-auto px-5 pt-6">
        <Button variant="secondary" size="md" href="/">
          <House className="size-[18px]" strokeWidth={2.6} />
          Ir a los retos de hoy
        </Button>
      </div>
    </Screen>
  );
}

function Invitation({ preview, signedIn, code }: { preview: InvitePreview; signedIn: boolean; code: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = inviteKey(code);

  const join = () => {
    setJoining(true);
    setError(null);
    setPendingJoin(null);
    groupsApi.join(code).then(
      ({ groupId }) => router.replace(`/grupos/${groupId}`),
      (cause: unknown) => {
        setError(groupErrorText(cause));
        setJoining(false);
      },
    );
  };

  // Back from creating the account (or signing in) after tapping "sumarme".
  // The note is used up right away, so this joins once even if the effect
  // runs twice; that's why the answer isn't tied to this render.
  useEffect(() => {
    if (!signedIn || preview.status !== "open" || pendingJoin() !== key) return;
    setPendingJoin(null);
    groupsApi.join(code).then(
      ({ groupId }) => router.replace(`/grupos/${groupId}`),
      (cause: unknown) => setError(groupErrorText(cause)),
    );
  }, [signedIn, preview.status, key, code, router]);

  if (preview.status === "member" && preview.groupId) {
    return (
      <Shell preview={preview}>
        <Button href={`/grupos/${preview.groupId}`}>Ver el grupo</Button>
        <p className="mt-2 text-center text-xs font-semibold text-ink-700">Ya sos parte de este grupo.</p>
      </Shell>
    );
  }
  if (preview.status === "expired") {
    return <Problem title="Este link venció">Los links de invitación duran 7 días. Pedile uno nuevo a quien te invitó.</Problem>;
  }
  if (preview.status === "full") {
    return <Problem title="El grupo está lleno">{`Ya tiene ${preview.maxMembers} miembros, que es el máximo.`}</Problem>;
  }

  const back = encodeURIComponent(`/g/${code}`);
  return (
    <Shell preview={preview}>
      {error && (
        <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
          {error}
        </p>
      )}
      {signedIn ? (
        <Button onClick={join} disabled={joining}>
          {joining ? "Sumándote…" : "Sumarme al grupo"}
        </Button>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Button href={`/cuenta/personaje?volver=${back}`} onClick={() => setPendingJoin(key)}>
            Crear mi cuenta y sumarme
          </Button>
          <Button variant="secondary" size="md" href={`/cuenta/entrar?volver=${back}`} onClick={() => setPendingJoin(key)}>
            Ya tengo cuenta
          </Button>
          <p className="text-center text-xs font-semibold text-ink-700">La cuenta es un apodo y una contraseña, sin email.</p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ preview, children }: { preview: InvitePreview; children: ReactNode }) {
  return (
    <Screen clouds={CLOUDS}>
      <div className="flex flex-col items-center px-6 pt-8 text-center">
        <GroupEmblem emblem={preview.emblem} color={preview.color} size={84} className="shadow-lg" />
        <p className="mt-5 text-sm font-bold text-ink-700">Te invitaron a</p>
        <h1 className="mt-1 font-display text-[32px] leading-[1.05] font-extrabold tracking-[-.03em] [overflow-wrap:anywhere]">{preview.name}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink-500">
          <Users className="size-4" strokeWidth={2.4} />
          {preview.memberCount} {preview.memberCount === 1 ? "miembro" : "miembros"}
        </p>
      </div>
      <ul className="mx-5 mt-6 flex flex-col gap-2.5 rounded-card bg-white px-4 py-4 shadow-md">
        {[
          { Icon: CalendarDays, text: "3 retos por día, iguales para todos" },
          { Icon: Trophy, text: "El ranking del grupo, del día y de la semana" },
          { Icon: Crown, text: `Cada semana se corona ${crownTitle(preview.name)}` },
        ].map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm leading-[1.35] font-bold">
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-100 text-brand">
              <Icon className="size-4" strokeWidth={2.6} />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <div className="mt-auto px-5 pt-6">{children}</div>
    </Screen>
  );
}
