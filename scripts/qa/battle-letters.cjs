// A Diez Letras battle on three phones: the same letters at once, words sent while playing, the live points, "¡Tiempo!" and everyone's words on the podium.
// Usage: node scripts/qa/battle-letters.cjs [width height]   (see README.md)
const { BASE, launch, wait, check, phone, signup, shot, suffix, finish, fail, lettersWordsFinder } = require("./helpers.cjs");

const width = Number(process.argv[2] || 390);
const height = Number(process.argv[3] || 844);
const size = { width, height };

/** The letters on this phone's keys, in their order. */
const lettersOf = (p) => p.page.locator('button[aria-label^="Letra "]').evaluateAll((keys) => keys.map((key) => key.getAttribute("aria-label").slice(6)));

/** Types a word on the physical keyboard and sends it with Enter. */
async function type(p, word) {
  await p.page.keyboard.type(word.toLowerCase(), { delay: 40 });
  await p.page.keyboard.press("Enter");
  await wait(250);
}

(async () => {
  const findWords = lettersWordsFinder();
  const browser = await launch();
  const run = suffix();
  const pato = await phone(browser, "pato", size);
  const juli = await phone(browser, "juli", size);
  const toto = await phone(browser, "toto", size);
  await signup(pato, `Pato${run}`, { species: "zorro", color: "natural", accessory: "gorra" });
  await signup(juli, `Juli${run}`, { species: "pinguino", color: "rosa", accessory: "bufanda" }, "la");
  await signup(toto, `Toto${run}`, { species: "carpincho", color: "natural", accessory: "mate" });

  // A loose room: Pato opens it, the others come with the code.
  const opened = await pato.context.request.post(`${BASE}/api/batallas`, { data: { groupId: null } });
  const { battleId } = await opened.json();
  const state = await (await pato.context.request.get(`${BASE}/api/batallas/${battleId}`)).json();
  for (const p of [juli, toto]) await p.context.request.post(`${BASE}/api/batallas/codigo/${state.code}`, { data: {} });
  for (const p of [pato, juli, toto]) await p.page.goto(`${BASE}/batalla/${battleId}`);

  await pato.page.getByText("Empezar · 3 jugadores").waitFor({ timeout: 30000 });
  await pato.page.getByRole("button", { name: /Diez\s*Letras/ }).click();
  await juli.page.getByText(/Las mismas 10 letras para todos/).waitFor({ timeout: 10000 });
  check("the room offers Diez Letras and tells how it goes", true);
  await shot(juli, "letras-01-sala");
  await pato.page.getByRole("button", { name: /Empezar/ }).click();
  await juli.page.getByText("¡Prepárense!").waitFor({ timeout: 10000 });

  const players = [pato, juli, toto];
  await Promise.all(players.map((p) => p.page.locator('button[aria-label^="Letra "]').first().waitFor({ timeout: 20000 })));
  const sets = await Promise.all(players.map(lettersOf));
  const sorted = sets.map((letters) => [...letters].sort().join(""));
  check("everyone has the same ten letters", sets.every((letters) => letters.length === 10) && sorted.every((one) => one === sorted[0]));
  await shot(juli, "letras-02-tablero");

  // Long words for Pato, a few for Juli (one in common with Pato) and two for Toto, with a wrong one and a repeat.
  const valid = findWords(sets[0]);
  const shortOnes = valid.filter((word) => word.length <= 5);
  const patoWords = valid.filter((word) => word.length >= 6 && word.length < 10).slice(0, 6);
  const juliWords = [patoWords[0], ...shortOnes.slice(0, 3)];
  const totoWords = shortOnes.slice(3, 5);
  // A wrong one has to be made of the set's letters: the keys only type those.
  const rotations = sets[0].map((_, i) => [...sets[0].slice(i), ...sets[0].slice(0, i)].slice(0, 4).join(""));
  const wrong = rotations.find((word) => !valid.includes(word));
  check("the set has words of every kind", patoWords.length === 6 && shortOnes.length >= 5 && Boolean(wrong));

  await Promise.all([
    (async () => {
      for (const word of patoWords) await type(pato, word);
    })(),
    (async () => {
      for (const word of juliWords) await type(juli, word);
    })(),
    (async () => {
      await type(toto, totoWords[0]);
      await type(toto, wrong);
      await type(toto, totoWords[0]);
      await type(toto, totoWords[1]);
    })(),
  ]);
  await wait(2000);
  await shot(juli, "letras-03-jugando");
  await shot(toto, "letras-03-jugando-toto");

  const juliText = await juli.page.locator("main").innerText();
  check("Juli sees Pato's points live", /Vos/.test(juliText) && (await juli.page.getByLabel("Puntos en vivo").innerText()).includes(`Pato${run}`.slice(0, 4)));
  check("Juli doesn't see Pato's own words while playing", patoWords.slice(1).every((word) => !juliText.includes(word)));
  check("Toto's wrong word shows as not valid", (await toto.page.getByLabel(`${wrong}: no vale`).count()) === 1);
  check("all of Pato's words count", (await pato.page.locator('li[aria-label$="+120"], li[aria-label$="+160"], li[aria-label$="+220"]').count()) === patoWords.length);

  // The last seconds and "¡Tiempo!".
  await juli.page.getByText(/^0:0[1-9]$/).waitFor({ timeout: 100000 });
  await shot(juli, "letras-04-ultimos");
  await juli.page.getByText("¡Tiempo!").waitFor({ timeout: 15000 });
  await shot(juli, "letras-05-tiempo");
  check("everyone sees ¡Tiempo!", (await Promise.all(players.map((p) => p.page.getByText("¡Tiempo!").count()))).every((n) => n === 1));

  // The podium: Pato won, and his words show when Juli taps his row.
  await Promise.all(players.map((p) => p.page.getByText("Las palabras de cada uno").waitFor({ timeout: 20000 })));
  check("Juli's podium says Pato won", (await juli.page.getByText(`¡Ganó Pato${run}!`).count()) === 1);
  await shot(juli, "letras-06-podio");
  await juli.page.getByRole("button", { name: new RegExp(`Pato${run}.*palabras`) }).click();
  await wait(300);
  const opened2 = await juli.page.locator("main").innerText();
  check("tapping Pato shows all his words", patoWords.every((word) => opened2.includes(word)));
  await juli.page.getByLabel("Las palabras de cada uno").scrollIntoViewIfNeeded();
  await shot(juli, "letras-07-palabras");
  check("a word only one found has its star", (await juli.page.getByLabel("Solo la encontró esta persona").count()) >= 1);

  const final = await (await juli.context.request.get(`${BASE}/api/batallas/${battleId}`)).json();
  check("the server's table puts Pato first", final.match.standings[0].userId === state.hostId && final.stage === "podium");
  await finish(browser);
})().catch(fail);
