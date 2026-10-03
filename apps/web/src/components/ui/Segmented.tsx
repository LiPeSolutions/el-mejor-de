import type { ReactNode } from "react";
import { cx } from "./cx";

/** Two-option switch (design: "Hoy / Semana"). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="grid rounded-full bg-white p-1 shadow-sm" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "flex h-8 items-center justify-center gap-1 rounded-full text-[13px] transition",
              active ? "bg-brand font-extrabold text-white shadow-[0_6px_14px_rgba(79,107,255,.35)]" : "font-bold text-ink-500",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
