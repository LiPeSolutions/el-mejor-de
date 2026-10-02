import { connection } from "next/server";
import { GAME_CATALOG, dailyLineup } from "@repo/games";
import { msUntilNextGameDay, toGameDate } from "@repo/shared";
import { brand } from "@/config/brand";

// Temporary page: the real screens come from the Claude Design handoff.
export default async function Home() {
  await connection(); // today's lineup depends on the request date
  const now = new Date();
  const lineup = dailyLineup(toGameDate(now));
  const minutesLeft = Math.floor(msUntilNextGameDay(now) / 60_000);
  const countdown = `${Math.floor(minutesLeft / 60)} h ${minutesLeft % 60} min`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide opacity-60">Muy pronto</p>
        <h1 className="text-4xl font-bold">👑 {brand.name}</h1>
        <p className="text-lg opacity-80">{brand.tagline}</p>
      </header>

      <section aria-labelledby="hoy" className="space-y-3">
        <h2 id="hoy" className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Retos de hoy
        </h2>
        <ol className="space-y-2">
          {lineup.map((id) => (
            <li key={id} className="rounded-xl border border-current/15 px-4 py-3">
              <p className="font-semibold">{GAME_CATALOG[id].name}</p>
              <p className="text-sm opacity-70">{GAME_CATALOG[id].summary}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm opacity-60">Nuevos retos en {countdown}.</p>
      </section>
    </main>
  );
}
