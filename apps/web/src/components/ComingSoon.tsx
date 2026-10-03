import { House, Users } from "lucide-react";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";

/** Placeholder for the sections still on their way (the rankings by place). */
export function ComingSoon({
  title,
  character,
  children,
  toGroups = false,
}: {
  title: string;
  character: ReactNode;
  children: ReactNode;
  /** Points to the groups instead of today's challenges. */
  toGroups?: boolean;
}) {
  return (
    <Screen clouds={["-right-[60px] top-[110px] w-[180px] opacity-95", "-left-[50px] bottom-[170px] w-[220px] opacity-95"]} nav>
      <header className="px-5">
        <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">{title}</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="relative">
          <div aria-hidden className="absolute top-[54%] left-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
          <div className="relative">{character}</div>
        </div>
        <Chip className="mt-6">Muy pronto</Chip>
        <p className="mt-3 text-[15px] leading-[1.45] font-semibold text-pretty text-ink-700">{children}</p>
        <div className="mt-6 w-full">
          {toGroups ? (
            <Button variant="secondary" size="md" href="/grupos">
              <Users className="size-[18px]" strokeWidth={2.6} />
              Ir a mis grupos
            </Button>
          ) : (
            <Button variant="secondary" size="md" href="/">
              <House className="size-[18px]" strokeWidth={2.6} />
              Ver los retos de hoy
            </Button>
          )}
        </div>
      </div>
      <BottomNav />
    </Screen>
  );
}
