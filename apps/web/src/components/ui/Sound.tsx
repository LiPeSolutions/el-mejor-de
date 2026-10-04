"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect } from "react";
import { setMusicOn, setSoundOn, unlockSound, useMusicOn, useSoundOn } from "@/lib/sound";
import { cx } from "./cx";
import { IconButton } from "./IconButton";

/** Opens the speaker on the first tap anywhere (browsers need one), and again if the phone paused it. */
export function SoundUnlock() {
  useEffect(() => {
    const events = ["pointerdown", "touchend", "keydown", "click"] as const;
    const unlock = () => unlockSound();
    for (const event of events) window.addEventListener(event, unlock, { capture: true, passive: true });
    return () => {
      for (const event of events) window.removeEventListener(event, unlock, { capture: true });
    };
  }, []);
  return null;
}

/** The speaker in the games' header: turns the app's sound on or off. */
export function SoundToggle({ tone = "white" }: { tone?: "white" | "light" | "glass" }) {
  const on = useSoundOn();
  return (
    <IconButton label={on ? "Apagar el sonido" : "Prender el sonido"} onClick={() => setSoundOn(!on)} tone={tone}>
      {on ? <Volume2 className="size-[18px]" strokeWidth={2.4} /> : <VolumeX className="size-[18px]" strokeWidth={2.4} />}
    </IconButton>
  );
}

function Switch({ label, on, disabled = false, onChange }: { label: string; on: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40", on ? "bg-brand" : "bg-ink-200")}
    >
      <span className={cx("absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
    </button>
  );
}

/** "Sonido" (everything) and "Música" (only the songs), for the profile. */
export function SoundSetting() {
  const on = useSoundOn();
  const music = useMusicOn();
  return (
    <div className="rounded-row bg-white px-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <div className="text-sm font-bold">Sonido</div>
          <div className="text-xs font-semibold text-ink-500">{on ? "Con el modo silencio del celu no suena" : "Apagado en este celu"}</div>
        </div>
        <Switch label="Sonido" on={on} onChange={setSoundOn} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line py-3">
        <div className={cx("min-w-0", !on && "opacity-50")}>
          <div className="text-sm font-bold">Música</div>
          <div className="text-xs font-semibold text-ink-500">{!on ? "Con el sonido apagado no suena" : music ? "La del menú y la de cada juego" : "Solo los efectos"}</div>
        </div>
        <Switch label="Música" on={on && music} disabled={!on} onChange={setMusicOn} />
      </div>
    </div>
  );
}
