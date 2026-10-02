import { Lock } from "lucide-react";

export function OneAttemptNotice() {
  return (
    <div className="mx-5 mt-3.5 flex items-start gap-3 rounded-[18px] border-2 border-gold bg-gold-soft px-3.5 py-3">
      <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-gold">
        <Lock className="size-[18px]" strokeWidth={2.4} />
      </div>
      <p className="text-sm font-bold leading-[1.35]">
        Tenés un solo intento.
        <br />
        <span className="font-semibold text-ink-700">Si salís, cuenta como jugado.</span>
      </p>
    </div>
  );
}
