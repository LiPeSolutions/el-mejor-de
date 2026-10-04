// A whole group battle on three phones: the group's card, the link, Cinco Preguntas, then Largada, and the group's tab.
// Usage: node scripts/qa/battle-group.cjs [width height]   (see README.md)
const { BASE, launch, wait, check, phone, signup, shot, suffix, finish, fail } = require("./helpers.cjs");

const width = Number(process.argv[2] || 390);
const height = Number(process.argv[3] || 844);
const size = { width, height };
const tap = (p) => p.page.touchscreen.tap(width / 2, height * 0.6);
/** The answer buttons still enabled. */
const choices = (p) => p.page.locator("button.rounded-tile:not([disabled])");

(async () => {
  const browser = await launch();
  const run = suffix();
  const pato = await phone(browser, "pato", size);
  const juli = await phone(browser, "juli", size);
  const toto = await phone(browser, "toto", size);
  await signup(pato, `Pato${run}`, { species: "zorro", color: "natural", accessory: "gorra" });
  await signup(juli, `Juli${run}`, { species: "pinguino", color: "rosa", accessory: "bufanda" }, "la");
  await signup(toto, `Toto${run}`, { species: "carpincho", color: "natural", accessory: "mate" });

  // A group with Pato and Juli; Toto isn't in it.
  const created = await pato.context.request.post(`${BASE}/api/grupos`, { data: { name: "Los primos", emblem: "casa", color: "coral" } });
  const group = (await created.json()).group;
  await juli.context.request.post(`${BASE}/api/invitaciones/${encodeURIComponent(group.invite.code)}`, { data: {} });

  // Pato opens it from the group.
  await pato.page.goto(`${BASE}/grupos/${group.id}`);
  await pato.page.getByText("Batalla en vivo").first().waitFor({ timeout: 20000 });
  await shot(pato, "01-grupo-armar");
  await pato.page.getByRole("button", { name: "Armar" }).click();
  await pato.page.waitForURL(/\/batalla\//);
  await pato.page.getByText("¿A qué jugamos?").waitFor({ timeout: 20000 });
  await shot(pato, "02-sala-sola");

  // Juli sees it live in the group and joins.
  await juli.page.goto(`${BASE}/grupos/${group.id}`);
  await juli.page.getByText(/armó una de/).waitFor({ timeout: 15000 });
  await shot(juli, "03-grupo-en-vivo");
  await juli.page.getByRole("button", { name: /Sumarme/ }).click();
  await juli.page.waitForURL(/\/batalla\//);
  await juli.page.getByText(/elige el juego/).waitFor({ timeout: 15000 });
  check("Juli joined from the group's card", true);

  // Toto comes with the link.
  const code = (await pato.page.locator("text=/^[2-9A-HJKMNP-Z]{4}$/").first().textContent()).trim();
  await toto.page.goto(`${BASE}/b/${code}`);
  await toto.page.getByText(/te invitó a una batalla/).waitFor({ timeout: 20000 });
  await shot(toto, "04-link");
  await toto.page.getByRole("button", { name: "Sumarme" }).click();
  await toto.page.waitForURL(/\/batalla\//);
  await pato.page.getByText("Empezar · 3 jugadores").waitFor({ timeout: 10000 });
  check("Toto joined with the link", true);
  await shot(pato, "05-sala-host");
  await shot(juli, "06-sala-invitada");

  // Cinco Preguntas.
  await pato.page.getByRole("button", { name: /Cinco\s*Preguntas/ }).click();
  await juli.page.getByText(/5 preguntas, la misma para todos/).waitFor({ timeout: 10000 });
  check("the game Pato chose shows on Juli's phone", true);
  await pato.page.getByRole("button", { name: /Empezar/ }).click();
  await juli.page.getByText("¡Prepárense!").waitFor({ timeout: 10000 });
  await shot(juli, "07-cuenta");

  const players = [pato, juli, toto];
  for (let round = 0; round < 5; round++) {
    await Promise.all(players.map((p) => p.page.getByText(`Pregunta ${round + 1} de 5`).waitFor({ timeout: 20000 })));
    await Promise.all(players.map((p) => choices(p).first().waitFor({ timeout: 10000 })));
    // Pato answers first (the first option), then Juli; Toto takes a moment, and lets the fourth run out.
    await choices(pato).nth(0).click();
    await wait(500);
    await choices(juli).nth(1).click();
    if (round === 0) await shot(juli, "08-esperando");
    await wait(900);
    if (round !== 3) await choices(toto).nth(2).click();
    await pato.page.getByText("La tabla").waitFor({ timeout: 20000 });
    if (round === 0) {
      await shot(pato, "09-tabla");
      await shot(toto, "09-tabla-toto");
    }
  }
  await pato.page.getByText(/^¡Gan|Empate arriba/).waitFor({ timeout: 20000 });
  check("Cinco Preguntas ended with the podium", true);
  await shot(pato, "10-podio-preguntas");
  await shot(juli, "10-podio-preguntas-juli");

  // Otro juego: Largada.
  await pato.page.getByRole("button", { name: "Otro juego" }).click();
  await pato.page.getByText("¿A qué jugamos?").waitFor({ timeout: 10000 });
  await pato.page.getByRole("button", { name: /^Largada/ }).click();
  await juli.page.getByText(/3 largadas con las mismas luces/).waitFor({ timeout: 10000 });
  await pato.page.getByRole("button", { name: /Empezar/ }).click();

  const delays = { pato: 180, juli: 320, toto: 0 };
  for (let round = 0; round < 3; round++) {
    await Promise.all(players.map((p) => p.page.getByText("Esperá…").waitFor({ timeout: 25000 })));
    if (round === 0) await shot(juli, "11-luces");
    await Promise.all(
      players.map(async (p) => {
        if (p.name === "toto" && round === 1) {
          // Toto jumps the second start.
          await wait(2500);
          await tap(p);
          return;
        }
        await p.page.getByText("¡LARGÁ!").waitFor({ timeout: 15000 });
        if (p.name === "pato" && round === 0) await shot(p, "12-larga");
        await wait(delays[p.name]);
        await tap(p);
      }),
    );
    if (round === 0) await shot(juli, "13-esperando-largada");
    await pato.page.locator("text=/Llegaste|Te adelantaste|No largaste/").first().waitFor({ timeout: 15000 });
    await wait(400);
    if (round === 0) {
      await shot(pato, "14-llegada");
      await shot(juli, "14-llegada-juli");
    }
    if (round === 1) await shot(toto, "15-adelantado");
  }
  await pato.page.getByText(/^¡Gan|Empate arriba/).waitFor({ timeout: 25000 });
  check("Largada ended with the podium", true);
  await shot(pato, "16-podio-largada");
  await shot(toto, "16-podio-largada-toto");

  // The group's tab, and what the server kept.
  await juli.page.goto(`${BASE}/grupos/${group.id}?vista=batallas`);
  await juli.page.getByText("Últimas batallas").waitFor({ timeout: 15000 });
  await shot(juli, "17-grupo-batallas");
  const tally = await (await juli.context.request.get(`${BASE}/api/grupos/${group.id}/batallas`)).json();
  check("the group keeps both battles", tally.recent.length === 2);
  // The trivia answers are a lottery (everyone might miss all five); Largada always has someone ahead.
  check("Largada has a winner", tally.recent[0]?.game === "reflexes" && tally.recent[0].winners.length > 0);
  check("the tally counts the wins", tally.wins.reduce((sum, row) => sum + row.wins, 0) >= 1);

  await finish(browser);
})().catch(fail);
