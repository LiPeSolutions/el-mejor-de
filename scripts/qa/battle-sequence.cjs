// A Secuencia battle on three phones: the same colors at once, one who's out (and watches), a tiebreak when the last two miss, and the podium.
// Usage: node scripts/qa/battle-sequence.cjs [width height]   (see README.md)
const { BASE, launch, wait, check, phone, signup, shot, suffix, finish, fail } = require("./helpers.cjs");

const width = Number(process.argv[2] || 390);
const height = Number(process.argv[3] || 844);
const size = { width, height };
const PADS = ["Estrella", "Luna", "Rayo", "Corazón"];

/** The battle as this phone's account sees it. */
const state = async (p, battleId) => (await p.context.request.get(`${BASE}/api/batallas/${battleId}`)).json();

/** Taps the pads, a little apart like a person (the server refuses what's faster than possible). */
async function taps(p, pads) {
  for (const pad of pads) {
    await p.page.getByRole("button", { name: PADS[pad], exact: true }).click();
    await wait(220);
  }
}

/** The colors of round `index`, once the server hands them out. */
async function colorsOf(p, battleId, index) {
  for (let i = 0; i < 80; i++) {
    const view = await state(p, battleId);
    if (view.match?.current?.index === index) return view.match.current.colors;
    await wait(250);
  }
  throw new Error(`round ${index} never came`);
}

(async () => {
  const browser = await launch();
  const run = suffix();
  const pato = await phone(browser, "pato", size);
  const juli = await phone(browser, "juli", size);
  const toto = await phone(browser, "toto", size);
  await signup(pato, `Pato${run}`, { species: "zorro", color: "natural", accessory: "gorra" });
  await signup(juli, `Juli${run}`, { species: "pinguino", color: "rosa", accessory: "bufanda" }, "la");
  await signup(toto, `Toto${run}`, { species: "carpincho", color: "natural", accessory: "mate" });

  const opened = await pato.context.request.post(`${BASE}/api/batallas`, { data: { groupId: null } });
  const { battleId } = await opened.json();
  const room = await state(pato, battleId);
  for (const p of [juli, toto]) await p.context.request.post(`${BASE}/api/batallas/codigo/${room.code}`, { data: {} });
  for (const p of [pato, juli, toto]) await p.page.goto(`${BASE}/batalla/${battleId}`);

  await pato.page.getByText("Empezar · 3 jugadores").waitFor({ timeout: 30000 });
  await pato.page.getByRole("button", { name: /^Secuencia/ }).click();
  await juli.page.getByText(/La misma secuencia para todos/).waitFor({ timeout: 10000 });
  check("the room offers Secuencia and tells how it goes", true);
  await pato.page.getByRole("button", { name: /Empezar/ }).click();
  const players = [pato, juli, toto];

  // Round 1 (3 colors): Pato and Juli repeat it; Toto misses the last one.
  const first = await colorsOf(juli, battleId, 0);
  await juli.page.getByText("Mirá…").waitFor({ timeout: 15000 });
  await wait(900);
  await shot(juli, "secuencia-01-mira");
  await Promise.all(players.map((p) => p.page.getByText("Tu turno").waitFor({ timeout: 15000 })));
  await shot(juli, "secuencia-02-tu-turno");
  // Toto misses first, so his screen waits for the others with the mistake on it.
  await taps(toto, [...first.slice(0, 2), (first[2] + 1) % 4]);
  await toto.page.getByText("Ese no era · esperá a los demás").waitFor({ timeout: 5000 });
  await shot(toto, "secuencia-03-error");
  await Promise.all([taps(pato, first), taps(juli, first)]);
  await juli.page.getByText(/Ya viene el próximo/).waitFor({ timeout: 10000 });
  await toto.page.getByText("Quedaste afuera en el nivel 1").waitFor({ timeout: 10000 });
  check("Toto is out after missing the first", true);
  await shot(juli, "secuencia-04-paso");
  await shot(toto, "secuencia-04-afuera");

  // Round 2 (4 colors): both miss, so it's a tiebreak; Toto watches.
  const second = await colorsOf(pato, battleId, 1);
  check("the next round has one more color, the same start", second.length === 4 && second.slice(0, 3).join() === first.join());
  await Promise.all([pato, juli].map((p) => p.page.getByText("Tu turno").waitFor({ timeout: 15000 })));
  check("Toto watches instead of playing", (await toto.page.getByText(/mirás cómo sigue/).count()) === 1 && (await toto.page.getByText("Tu turno").count()) === 0);
  await shot(toto, "secuencia-05-mirando");
  await Promise.all([taps(pato, [(second[0] + 1) % 4]), taps(juli, [...second.slice(0, 3), (second[3] + 2) % 4])]);
  await Promise.all([pato, juli].map((p) => p.page.getByText(/¡Desempate!/).waitFor({ timeout: 10000 })));
  check("both see the tiebreak", true);
  await shot(juli, "secuencia-06-desempate");

  // The tiebreak: the same 4 colors again; Juli repeats it, Pato misses.
  const again = await colorsOf(juli, battleId, 2);
  check("the tiebreak repeats the same colors", again.join() === second.join());
  await Promise.all([pato, juli].map((p) => p.page.getByText("Tu turno").waitFor({ timeout: 15000 })));
  await taps(juli, again);
  await juli.page.getByText(/¡Bien! Esperando a/).waitFor({ timeout: 5000 });
  await shot(juli, "secuencia-07-esperando");
  await taps(pato, [...again.slice(0, 1), (again[1] + 1) % 4]);

  await Promise.all(players.map((p) => p.page.getByText("Las batallas no cuentan para el ranking ni la corona").waitFor({ timeout: 20000 })));
  check("Pato's podium says Juli won", (await pato.page.getByText(`¡Ganó Juli${run}!`).count()) === 1);
  await shot(pato, "secuencia-08-podio");
  await shot(juli, "secuencia-08-podio-juli");
  const final = await state(toto, battleId);
  check("the server's table: Juli, Pato, Toto", final.match.standings.map((row) => row.place).join() === "1,2,3" && final.match.standings[0].alive === true);
  await finish(browser);
})().catch(fail);
