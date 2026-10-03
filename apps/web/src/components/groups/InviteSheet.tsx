"use client";

import { crownTitle } from "@repo/shared";
import { Check, Copy, LoaderCircle, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { brand } from "@/config/brand";
import { groupsApi } from "@/lib/api";
import { formatDayMonth } from "@/lib/format";
import { groupErrorText } from "@/lib/group-copy";
import type { GroupDetail } from "@/lib/group-types";
import { GroupEmblem } from "./Emblem";

/** The invitation link: this same app, so it works on any address it runs. */
export function inviteLink(code: string): string {
  return `${window.location.origin}/g/${code}`;
}

function defaultMessage(group: GroupDetail): string {
  return `Sumate a "${group.name}" en ${brand.name}: 3 retos por día, a ver quién es ${crownTitle(group.name)} 👑`;
}

/** The expiry date in Argentina ("10/10"), from an ISO instant. */
function expiryDay(iso: string): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));
  return formatDayMonth(date);
}

/**
 * Invitá al grupo (design 33): the code, a message to share and three ways
 * to send it. An expired link is renewed on opening; the owner can replace a
 * working one.
 */
export function InviteSheet({ group, onClose, onChanged }: { group: GroupDetail; onClose: () => void; onChanged: (group: GroupDetail) => void }) {
  const [message, setMessage] = useState(() => defaultMessage(group));
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = group.invite.expired;

  const renew = () => {
    setRenewing(true);
    setError(null);
    groupsApi.renewInvite(group.id).then(
      ({ group: renewed }) => {
        onChanged(renewed);
        setRenewing(false);
      },
      (cause: unknown) => {
        setError(groupErrorText(cause));
        setRenewing(false);
      },
    );
  };

  // A link that already expired is renewed right away: any member can.
  const renewed = useEffectEvent((group: GroupDetail) => onChanged(group));
  useEffect(() => {
    if (!expired) return;
    let alive = true;
    groupsApi.renewInvite(group.id).then(
      ({ group: next }) => alive && renewed(next),
      (cause: unknown) => alive && setError(groupErrorText(cause)),
    );
    return () => {
      alive = false;
    };
  }, [expired, group.id]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const link = inviteLink(group.invite.code);
  const fullText = `${message.trim()}\n${link}`;
  const copy = async (what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "code" ? group.invite.code : link);
      setCopied(what);
    } catch {
      setError("No pudimos copiar. Mantené apretado el código para copiarlo.");
    }
  };
  const shareElsewhere = async () => {
    try {
      if (navigator.share) await navigator.share({ title: brand.name, text: message.trim(), url: link });
      else await copy("link");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) await copy("link");
    }
  };

  const places = group.maxMembers - group.memberCount;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[linear-gradient(180deg,rgba(90,97,128,.6),rgba(115,120,143,.75))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-ink-200" />
        <div className="flex items-center gap-3">
          <GroupEmblem emblem={group.emblem} color={group.color} size={44} />
          <div className="min-w-0">
            <h2 id="invite-title" className="font-display text-xl leading-tight font-extrabold tracking-[-.01em] [overflow-wrap:anywhere]">
              Invitá a {group.name}
            </h2>
            <p className="text-xs font-semibold text-ink-500">
              {group.memberCount} {group.memberCount === 1 ? "miembro" : "miembros"} · {places > 0 ? `${places === 1 ? "queda 1 lugar" : `quedan ${places} lugares`}` : "no quedan lugares"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-card border-2 border-dashed border-ink-300 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[.08em] text-ink-500 uppercase">Código del grupo</div>
            <div className={cx("font-display text-[28px] leading-tight font-extrabold tracking-[.06em]", (expired || renewing) && "opacity-40")}>
              {group.invite.code}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void copy("code")}
            aria-label="Copiar el código"
            className="grid size-11 shrink-0 place-items-center rounded-key bg-surface-2 text-ink-700 transition active:scale-95"
          >
            {copied === "code" ? <Check className="size-5 text-success" strokeWidth={2.8} /> : <Copy className="size-5" strokeWidth={2.4} />}
          </button>
        </div>

        <div className="mt-3 rounded-row bg-surface-2 px-3.5 py-3">
          {editing ? (
            <>
              <label htmlFor="invite-message" className="sr-only">
                Mensaje de invitación
              </label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 300))}
                rows={3}
                className="w-full resize-none bg-transparent text-[13px] leading-[1.45] font-semibold outline-none"
              />
            </>
          ) : (
            <p className="text-[13px] leading-[1.45] font-semibold text-ink-700">{message}</p>
          )}
          <div className="mt-1 flex items-end justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-semibold text-ink-500">{link.replace(/^https?:\/\//, "")}</span>
            <button type="button" onClick={() => setEditing((value) => !value)} className="shrink-0 text-xs font-extrabold text-brand">
              {editing ? "Listo" : "Editar"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(fullText)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 text-xs font-bold"
          >
            <span className="grid size-[52px] place-items-center rounded-full bg-whatsapp text-white shadow-[0_10px_20px_rgba(37,211,102,.3)]">
              <MessageCircle className="size-6" strokeWidth={2.3} />
            </span>
            WhatsApp
          </a>
          <button type="button" onClick={() => void copy("link")} className="flex flex-col items-center gap-1.5 text-xs font-bold">
            <span className="grid size-[52px] place-items-center rounded-full bg-brand text-white shadow-btn">
              {copied === "link" ? <Check className="size-6" strokeWidth={2.8} /> : <Copy className="size-6" strokeWidth={2.3} />}
            </span>
            {copied === "link" ? "¡Copiado!" : "Copiar link"}
          </button>
          <button type="button" onClick={() => void shareElsewhere()} className="flex flex-col items-center gap-1.5 text-xs font-bold">
            <span className="grid size-[52px] place-items-center rounded-full bg-ink text-white shadow-md">
              <Share2 className="size-6" strokeWidth={2.3} />
            </span>
            Otras apps
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm font-bold text-danger">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-ink-500">
          {expired || renewing ? (
            <span className="flex items-center gap-1.5">
              <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.6} />
              Haciendo un link nuevo…
            </span>
          ) : (
            <span>
              El link vence el {expiryDay(group.invite.expiresAt)}
              {group.isOwner ? " · podés renovarlo cuando quieras" : ""}
            </span>
          )}
        </div>
        {group.isOwner && !expired && (
          <button
            type="button"
            onClick={renew}
            disabled={renewing}
            className="mx-auto mt-1.5 flex items-center gap-1.5 text-xs font-extrabold text-brand disabled:opacity-45"
          >
            <RefreshCw className="size-3.5" strokeWidth={2.6} />
            Hacer un link nuevo (el anterior deja de andar)
          </button>
        )}

        <div className="mt-4">
          <Button variant="neutral" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
