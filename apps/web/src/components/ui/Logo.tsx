import { Crown } from "lucide-react";
import { brand } from "@/config/brand";

export function Logo({ place }: { place?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-[30px] place-items-center rounded-[10px] bg-brand text-gold shadow-[0_6px_14px_rgba(79,107,255,.35)]">
        <Crown className="size-4 fill-current" strokeWidth={2.2} />
      </div>
      <div className="font-display text-base font-extrabold tracking-[-.02em]">
        {brand.name}
        {place && <span className="text-brand"> {place}</span>}
      </div>
    </div>
  );
}
