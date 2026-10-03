"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect } from "react";
import { setSoundOn, unlockSound, useSoundOn } from "@/lib/sound";
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

/** "Sonido" with its switch, for the profile. */
export function SoundSetting() {
  const on = useSoundOn();
  return (
    <div className="flex items-center justify-between gap-3 rounded-row bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <div className="text-sm font-bold">Sonido</div>
        <div className="text-xs font-semibold text-ink-500">{on ? "Con el modo silencio del celu no suena" : "Apagado en este celu"}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Sonido"
        onClick={() => setSoundOn(!on)}
        className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-ink-200")}
      >
        <span className={cx("absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
      </button>
    </div>
  );
}
