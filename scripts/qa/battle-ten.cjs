// A full room: ten players, with the host's phone on screen during Cinco Preguntas and Tubitos (the live strips have to fit).
// Usage: node scripts/qa/battle-ten.cjs [width height]   (see README.md)
const { BASE, launch, check, phone, signup, shot, suffix, finish, fail } = require("./helpers.cjs");

const width = Number(process.argv[2] || 360);
const height = Number(process.argv[3] || 740);
const ANIMALS = ["zorro", "pinguino", "carpincho", "zorro", "pinguino", "carpincho", "zorro", "pinguino", "carpincho", "zorro"];

/** The battle as this phone's account sees it. */
const state = async (p, battleId) => (await p.context.request.get(`${BASE}/api/batallas/${battleId}`)).json();

(async () => {
  const browser = await launch();
  const run = suffix();
  const phones = [];
  for (let i = 0; i < 10; i++) {
    const p = await phone(browser, `p${i}`, { width, height });
    await signup(p, `Jugador${i}${run}`, { species: ANIMALS[i], color: "natural", accessory: "gorra" });
    phones.push(p);
  }
  const [host, ...rest] = phones;

  for (const [game, title, label] of [
    ["five-questions", "Pregunta 1 de 5", "diez-02-preguntas"],
    ["water-sort", "Tablero 1 de 3", "diez-03-tubitos"],
  ]) {
    // A fresh room for each game: joining it takes everyone out of the last one.
    const { battleId } = await (await host.context.request.post(`${BASE}/api/batallas`, { data: { groupId: null } })).json();
    const room = await state(host, battleId);
    for (const p of rest) await p.context.request.post(`${BASE}/api/batallas/codigo/${room.code}`, { data: {} });
    // Only the host's phone is open; the others are in the room by the server.
    await host.page.goto(`${BASE}/batalla/${battleId}`);
    await host.page.getByText("Empezar · 10 jugadores").waitFor({ timeout: 30000 });
    if (game === "five-questions") {
      check("ten players fit in the room", true);
      await shot(host, "diez-01-sala");
    }
    await host.context.request.post(`${BASE}/api/batallas/${battleId}/juego`, { data: { game } });
    await host.context.request.post(`${BASE}/api/batallas/${battleId}/empezar`, { data: {} });
    await host.page.getByText(title).first().waitFor({ timeout: 30000 });
    await host.page.getByText(/^En vivo$/i).first().waitFor({ timeout: 10000 });
    await host.page.waitForTimeout(1500);
    const { wide } = await shot(host, label);
    check(`${game}: the page doesn't overflow sideways with ten`, !wide);
    const strip = host.page.locator("div.overflow-x-auto").first();
    const slides = await strip.evaluate((element) => element.scrollWidth > element.clientWidth);
    check(`${game}: the strip slides instead of spilling`, slides);
  }
  await finish(browser);
})().catch(fail);
