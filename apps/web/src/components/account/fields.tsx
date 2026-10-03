"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown inside the field on the right, e.g. "Disponible". */
  status?: ReactNode;
  /** Help under the field; `error` replaces it in red. */
  hint?: ReactNode;
  error?: string | null;
  type?: "text" | "password";
  autoComplete?: string;
  maxLength?: number;
  trailing?: ReactNode;
  autoFocus?: boolean;
}

/** White 50 px field with an uppercase label (design 18). */
export function TextField({ label, value, onChange, status, hint, error, type = "text", autoComplete, maxLength, trailing, autoFocus }: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div className="px-5 pt-3.5">
      <Label>
        <label htmlFor={id}>{label}</label>
      </Label>
      <div
        className={cx(
          "mt-1.5 flex h-[50px] items-center gap-2.5 rounded-row border-2 bg-white pr-2 pl-3.5 shadow-sm transition-colors",
          error ? "border-danger" : "border-transparent focus-within:border-brand",
        )}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? helpId : undefined}
          className="min-w-0 flex-1 bg-transparent font-display text-[17px] font-extrabold outline-none placeholder:text-ink-300"
        />
        {status && <div className="flex shrink-0 items-center gap-1 text-xs font-bold">{status}</div>}
        {trailing}
      </div>
      {(error || hint) && (
        <p id={helpId} role={error ? "alert" : undefined} className={cx("mt-1.5 px-1 text-xs leading-[1.4] font-semibold", error ? "text-danger" : "text-ink-500")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Password with a show / hide button. */
export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing" | "status">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-500 active:bg-surface-2"
        >
          {visible ? <EyeOff className="size-[18px]" strokeWidth={2.4} /> : <Eye className="size-[18px]" strokeWidth={2.4} />}
        </button>
      }
    />
  );
}

/** A row of options where one is chosen (radio buttons that look like cells). */
export function Choices<T extends string | null>({
  label,
  options,
  value,
  onChange,
  render,
  className,
  cellClassName,
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (value: T) => void;
  render: (option: T, selected: boolean) => { content: ReactNode; label: string; caption?: string };
  className?: string;
  cellClassName?: string;
}) {
  return (
    // Margin, not padding: a fieldset puts its padding below the legend.
    <fieldset className={cx("mt-3.5 px-5", className)}>
      <legend className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-500">{label}</legend>
      <div className="mt-2 flex gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          const { content, label: name, caption } = render(option, selected);
          return (
            <label key={String(option)} className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-[3px]">
              <input type="radio" className="peer sr-only" checked={selected} onChange={() => onChange(option)} aria-label={name} />
              <span
                className={cx(
                  "grid w-full place-items-center bg-white transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2",
                  selected ? "shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-brand)]" : "shadow-sm",
                  cellClassName ?? "h-[50px] rounded-key",
                )}
              >
                {content}
              </span>
              {caption && <span className="text-[9.5px] font-bold text-ink-500">{caption}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
