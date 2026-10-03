"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { SoundToggle } from "@/components/ui/Sound";
import { Toast, type ToastTone } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/format";

/** Close button and the speaker · game title · right element (clock, level…). */
export function GameHeader({ title, right, onClose, dark = false }: { title: ReactNode; right?: ReactNode; onClose: () => void; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-5">
      <div className="flex gap-2">
        <IconButton label="Salir" onClick={onClose} tone={dark ? "light" : "white"}>
          <X className="size-[18px]" strokeWidth={2.6} />
        </IconButton>
        <SoundToggle tone={dark ? "light" : "white"} />
      </div>
      <div className="text-center text-[13px] font-extrabold uppercase tracking-[.06em] text-(--game-title)">{title}</div>
      <div className="flex min-w-[84px] justify-end">{right}</div>
    </div>
  );
}

/** "PUNTAJE 540" on the left, another stat on the right. */
export function ScoreRow({ score, label, value }: { score: number; label: string; value: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-6 pt-[18px]">
      <div>
        <Label>Puntaje</Label>
        <div className="mt-0.5 font-display text-4xl leading-none font-extrabold tracking-[-.03em] tabular-nums">{formatNumber(score)}</div>
      </div>
      <div className="text-right">
        <Label>{label}</Label>
        <div className="mt-1 font-display text-2xl leading-none font-extrabold">{value}</div>
      </div>
    </div>
  );
}

export interface ToastState {
  tone: ToastTone;
  icon: ReactNode;
  text: ReactNode;
  key: number;
}

/** Toast that disappears after `durationMs` (1.2 s by default). */
export function useToast(durationMs = 1200): [ToastState | null, (toast: Omit<ToastState, "key">) => void] {
  const [toast, setToast] = useState<ToastState | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(id);
  }, [toast, durationMs]);
  const show = useCallback((next: Omit<ToastState, "key">) => setToast({ ...next, key: Date.now() }), []);
  return [toast, show];
}

export function FloatingToast({ toast, className }: { toast: ToastState | null; className?: string }) {
  if (!toast) return null;
  return (
    <div key={toast.key} className={`absolute left-1/2 z-20 animate-toast ${className ?? ""}`}>
      <Toast tone={toast.tone} icon={toast.icon}>
        {toast.text}
      </Toast>
    </div>
  );
}

/** "¿Salís?" bottom sheet shown when closing during a challenge. */
export function ExitDialog({ open, practice, onStay, onLeave }: { open: boolean; practice: boolean; onStay: () => void; onLeave: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[linear-gradient(180deg,rgba(90,97,128,.6),rgba(115,120,143,.75))]" role="dialog" aria-modal="true" aria-labelledby="exit-title">
      <div className="w-full max-w-[430px] rounded-t-[28px] bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-ink-200" />
        <h2 id="exit-title" className="font-display text-2xl font-extrabold tracking-[-.02em]">
          {practice ? "¿Salís de la práctica?" : "¿Seguro que querés salir?"}
        </h2>
        <p className="mt-2 text-[15px] font-medium text-ink-700">
          {practice ? "No pasa nada: la práctica no cuenta para nada." : "Tenés un solo intento: si salís, el reto cuenta como jugado con lo que llevás."}
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button size="md" onClick={onStay}>
            Seguir jugando
          </Button>
          <Button size="md" variant="neutral" onClick={onLeave}>
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
