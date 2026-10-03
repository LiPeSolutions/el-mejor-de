"use client";

import { useEffect, useState } from "react";

/** 10 px bar that grows with the score, filled with the game's gradient. */
export function ProgressBar({ value, max = 1000, className = "mx-10 mt-3" }: { value: number; max?: number; className?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.max(0, Math.min(100, (value / max) * 100))));
    return () => cancelAnimationFrame(id);
  }, [value, max]);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`${className} h-2.5 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(35,38,58,.06)]`}
    >
      <div
        className="h-full rounded-full bg-(image:--game-gradient) transition-[width] duration-[900ms] ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
