import { WATER_SORT_FROM, rotationGames } from "@repo/games";
import { addDays } from "@repo/shared";
import { Gamepad2, House, X } from "lucide-react";
import { Personaje } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { gameBySlug, gameStyle, type GameSlug } from "@/lib/games";

/**
 * Each day 3 of the games are played and the others rest (none two days in
 * a row). A game that isn't in the daily challenge yet (Tubitos before
 * 5/10/2026) says when it arrives.
 */
export function RestingGame({ slug, date }: { slug: GameSlug; date: string }) {
  const game = gameBySlug(slug)!;
  const games = rotationGames(date);
  const arriving = !games.includes(game.id);
  const tomorrow = addDays(date, 1) === WATER_SORT_FROM;
  const title = arriving ? (tomorrow ? `${game.name} se estrena mañana` : `${game.name} llega pronto`) : `Hoy ${game.name} descansa`;
  const text = arriving
    ? `${tomorrow ? "Desde mañana" : "Muy pronto"} entra al reto del día. Mientras, ya podés practicarlo.`
    : `Cada día se juegan 3 de los ${games.length} juegos. ${game.name} vuelve mañana con un reto nuevo; mientras, podés practicarlo.`;
  return (
    <Screen clouds={["-right-[60px] top-[120px] w-[180px] opacity-95", "-left-[50px] bottom-[150px] w-[220px] opacity-95"]} style={gameStyle(game)}>
      <div className="px-5">
        <IconButton label="Volver" href="/">
          <X className="size-[18px]" strokeWidth={2.6} />
        </IconButton>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="relative">
          <div aria-hidden className="absolute top-[54%] left-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
          <div className="relative">
            <Personaje {...game.mascot} prop={undefined} pose="sleep" size={130} anim="bob" />
          </div>
        </div>
        <h1 className="mt-6 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-.03em] text-balance">{title}</h1>
        <p className="mt-3 text-[15px] leading-[1.45] font-medium text-pretty text-ink-700">{text}</p>
      </div>
      <div className="flex flex-col gap-2.5 px-5">
        <Button href="/">
          <House className="size-5" strokeWidth={2.4} />
          Ver los retos de hoy
        </Button>
        <Button variant="secondary" size="md" href={`/practicar/${game.slug}`}>
          <Gamepad2 className="size-[18px]" strokeWidth={2.6} />
          Practicar {game.name}
        </Button>
      </div>
    </Screen>
  );
}
