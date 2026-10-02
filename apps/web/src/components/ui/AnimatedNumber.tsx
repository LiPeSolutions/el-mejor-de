"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { formatNumber } from "@/lib/format";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Counts from 0 to `value` (0.9 s, ease-out), or shows it right away with reduced motion. */
export function AnimatedNumber({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reducedMotion]);
  return <>{formatNumber(reducedMotion ? value : shown)}</>;
}
