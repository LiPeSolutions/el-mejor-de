// Battle edge cases: a loose battle from Práctica, someone who arrives mid-match, the rematch, leaving and the host passing on.
// Usage: node scripts/qa/battle-edges.cjs [width height]   (see README.md)
const { BASE, launch, wait, check, phone, signup, shot, suffix, finish, fail } = require("./helpers.cjs");

const width = Number(process.argv[2] || 360);
const height = Number(process.argv[3] || 740);
const size = { width, height };
/** The answer buttons still enabled. */
const choices = (p) => p.page.locator("button.rounded-tile:not([disabled])");

/** Everyone in `players` answers question `round`; then the table. */
async function answerAll(players, round) {
  await Promise.all(players.map((p) => p.page.getByText(`Pregunta ${round + 1} de 5`).waitFor({ timeout: 25000 })));
  for (const p of players) {
    await choices(p).first().waitFor({ timeout: 10000 });
    await choices(p).nth(round % 4).click();
    await wait(200);
  }
  await players[0].page.getByText("La tabla").waitFor({ timeout: 20000 });
}

(async () => {
  const browser = await launch();
  const run = suffix();
  const ana = await phone(browser, "ana", size);
  const beto = await phone(browser, "beto", size);
  const ceci = await phone(browser, "ceci", size);
  await signup(ana, `Ana${run}`, { species: "llama", color: "violeta", accessory: "boina" }, "la");
  await signup(beto, `Beto${run}`, { species: "rana", color: "natural", accessory: null });
  await signup(ceci, `Ceci${run}`, { species: "hornero", color: "dorado", accessory: "anteojos" }, "la");

  // A loose battle from Práctica.
  await ana.page.goto(`${BASE}/practicar`);
  await ana.page.getByText("Batalla con amigos").waitFor({ timeout: 20000 });
  await shot(ana, "21-practica");
  await ana.page.getByRole("button", { name: "Armar" }).click();
  await ana.page.waitForURL(/\/batalla\//);
  await ana.page.getByText("¿A qué jugamos?").waitFor({ timeout: 20000 });
  const code = (await ana.page.locator("text=/^[2-9A-HJKMNP-Z]{4}$/").first().textContent()).trim();
  check("a loose room has no group line", !(await ana.page.getByText("ya ven el aviso").count()));
  await beto.page.goto(`${BASE}/b/${code}`);
  await beto.page.getByRole("button", { name: "Sumarme" }).click();
  await beto.page.waitForURL(/\/batalla\//);
  await ana.page.getByText("Empezar · 2 jugadores").waitFor({ timeout: 10000 });
  await shot(ana, "22-sala-chica");

  // Cinco Preguntas, and Ceci arrives in the middle.
  await ana.page.getByRole("button", { name: /Cinco\s*Preguntas/ }).click();
  await wait(2500);
  await ana.page.getByRole("button", { name: /Empezar/ }).click();
  await answerAll([ana, beto], 0);
  check("the room plays music", (await ana.page.evaluate(() => document.documentElement.dataset.musica)) !== undefined);
  await ceci.page.goto(`${BASE}/b/${code}`);
  await ceci.page.getByText(/te invitó a una batalla/).waitFor({ timeout: 20000 });
  await shot(ceci, "23-link-jugando");
  await ceci.page.getByRole("button", { name: /Entrar a la sala|Sumarme/ }).click();
  await ceci.page.getByText("La batalla ya arrancó").waitFor({ timeout: 10000 });
  check("whoever arrives mid-match watches", true);
  await shot(ceci, "24-mirando");
  for (let round = 1; round < 5; round++) await answerAll([ana, beto], round);
  await ana.page.getByText(/^¡Gan|Empate arriba/).waitFor({ timeout: 20000 });
  await ceci.page.getByText(/^¡Gan|Empate arriba|elige: revancha/).first().waitFor({ timeout: 20000 });
  await shot(ceci, "25-podio-mirando");

  // The rematch, now with Ceci.
  await ana.page.getByRole("button", { name: "Revancha" }).click();
  await Promise.all([ana, beto, ceci].map((p) => p.page.getByText("Pregunta 1 de 5").waitFor({ timeout: 20000 })));
  check("Ceci plays the rematch", (await ceci.page.locator("button.rounded-tile").count()) === 4);
  await shot(ceci, "26-revancha");

  // Beto leaves mid-question from the X.
  await beto.page.getByRole("button", { name: "Salir" }).first().click();
  await beto.page.getByText("¿Salís de la batalla?").waitFor();
  await shot(beto, "27-salir");
  await beto.page.getByRole("button", { name: "Salir", exact: true }).last().click();
  await beto.page.waitForURL(/\/practicar/);
  check("Beto went back to Práctica", beto.page.url().includes("/practicar"));
  // The question closes without waiting for him.
  for (const p of [ana, ceci]) {
    await choices(p).first().click();
    await wait(200);
  }
  await ana.page.getByText("La tabla").waitFor({ timeout: 10000 });
  check("the table came without Beto", true);

  // Ana (the host) leaves too: Ceci takes over.
  await ana.page.getByRole("button", { name: "Salir" }).first().click();
  await ana.page.getByRole("button", { name: "Salir", exact: true }).last().click();
  await ana.page.waitForURL(/\/practicar/);
  for (let round = 1; round < 5; round++) {
    await ceci.page.getByText(`Pregunta ${round + 1} de 5`).waitFor({ timeout: 25000 });
    await choices(ceci).first().click();
    await ceci.page.getByText("La tabla").waitFor({ timeout: 20000 });
  }
  await ceci.page.getByRole("button", { name: "Revancha" }).waitFor({ timeout: 20000 });
  check("Ceci is the host now", true);
  await shot(ceci, "28-podio-nueva-anfitriona");

  // Beto opens the room again: he isn't in it anymore.
  await beto.page.goto(ceci.page.url());
  await beto.page.getByText("No estás en esta batalla").waitFor({ timeout: 10000 });
  check("whoever left sees they're out", true);
  await shot(beto, "29-no-estas");

  await finish(browser);
})().catch(fail);
