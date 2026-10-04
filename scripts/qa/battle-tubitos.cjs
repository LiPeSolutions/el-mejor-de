// A Tubitos battle on three phones: the same three boards, each phone with its own version, who solved it live, each board's table, someone who leaves mid-board, and the podium.
// Usage: node scripts/qa/battle-tubitos.cjs [width height]   (see README.md)
const { BASE, launch, wait, check, phone, signup, shot, suffix, finish, fail } = require("./helpers.cjs");
const { readBoard, pourStep, solve } = require("./tubitos-board.cjs");

const width = Number(process.argv[2] || 390);
const height = Number(process.argv[3] || 844);

/** The battle as this phone's account sees it. */
const state = async (p, battleId) => (await p.context.request.get(`${BASE}/api/batallas/${battleId}`)).json();

/** Waits for board `index` on this phone, open and ready to play. */
async function boardOn(p, index, tubes) {
  await p.page.getByText(`Tablero ${index + 1} de 3`).first().waitFor({ timeout: 30000 });
  await p.page.getByText("Tocá un tubo para levantarlo").waitFor({ timeout: 15000 });
  await p.page.locator('button[aria-label^="Tubo "]').nth(tubes - 1).waitFor({ timeout: 5000 });
  return readBoard(p.page);
}

/** Solves the board on screen, pour by pour. */
async function solveOn(p, board, reduced) {
  const { path } = solve(board);
  for (const [from, to] of path) await pourStep(p.page, from, to, { reduced });
}

(async () => {
  const browser = await launch();
  const run = suffix();
  const pato = await phone(browser, "pato", { width, height });
  const juli = await phone(browser, "juli", { width, height, reducedMotion: "reduce" });
  const toto = await phone(browser, "toto", { width, height, reducedMotion: "reduce" });
  await signup(pato, `Pato${run}`, { species: "zorro", color: "natural", accessory: "gorra" });
  await signup(juli, `Juli${run}`, { species: "pinguino", color: "rosa", accessory: "bufanda" }, "la");
  await signup(toto, `Toto${run}`, { species: "carpincho", color: "natural", accessory: "mate" });

  const opened = await pato.context.request.post(`${BASE}/api/batallas`, { data: { groupId: null } });
  const { battleId } = await opened.json();
  const room = await state(pato, battleId);
  for (const p of [juli, toto]) await p.context.request.post(`${BASE}/api/batallas/codigo/${room.code}`, { data: {} });
  for (const p of [pato, juli, toto]) await p.page.goto(`${BASE}/batalla/${battleId}`);

  await pato.page.getByText("Empezar · 3 jugadores").waitFor({ timeout: 30000 });
  await pato.page.getByRole("button", { name: /^Tubitos/ }).click();
  await juli.page.getByText(/Los mismos 3 tableros para todos/).waitFor({ timeout: 10000 });
  check("the room offers Tubitos and tells how it goes", true);
  await shot(pato, "tubitos-01-sala");
  await pato.page.getByRole("button", { name: /Empezar/ }).click();

  // Board 1 (6 tubes): everyone solves it, each one their own version; Pato first, to see the others wait.
  const boards = await Promise.all([boardOn(pato, 0, 6), boardOn(juli, 0, 6), boardOn(toto, 0, 6)]);
  check("everyone gets a board of 6 tubes", boards.every((board) => board.length === 6));
  check("each phone has its own version of the board", new Set(boards.map((board) => JSON.stringify(board))).size > 1);
  check("the boards are the same puzzle", new Set(boards.map((board) => solve(board).moves)).size === 1);
  await shot(juli, "tubitos-02-tablero");
  await solveOn(pato, boards[0], false);
  await pato.page.getByText(/¡Resuelto en \d+! Esperando a/).waitFor({ timeout: 10000 });
  await juli.page.getByText("Lo resolvieron 1 de 3").waitFor({ timeout: 10000 });
  check("the others see who already solved it", true);
  await shot(pato, "tubitos-03-esperando");
  await Promise.all([solveOn(juli, boards[1], true), solveOn(toto, boards[2], true)]);
  await Promise.all([pato, juli, toto].map((p) => p.page.getByText("¡Listo el tablero 1!").waitFor({ timeout: 15000 })));
  check("everyone sees the first board's table", true);
  await shot(juli, "tubitos-04-tabla");

  // Board 2 (8 tubes): all of them again.
  const second = await Promise.all([boardOn(pato, 1, 8), boardOn(juli, 1, 8), boardOn(toto, 1, 8)]);
  check("the second board has 8 tubes", second.every((board) => board.length === 8));
  await Promise.all([solveOn(pato, second[0], false), solveOn(juli, second[1], true), solveOn(toto, second[2], true)]);
  await juli.page.getByText("¡Listo el tablero 2!").waitFor({ timeout: 15000 });

  // Board 3 (10 tubes): Toto leaves halfway, and it closes without him.
  const third = await Promise.all([boardOn(pato, 2, 10), boardOn(juli, 2, 10), boardOn(toto, 2, 10)]);
  check("the third board has 10 tubes", third.every((board) => board.length === 10));
  await shot(pato, "tubitos-05-diez-tubos");
  await toto.context.request.post(`${BASE}/api/batallas/${battleId}/salir`, { data: {} });
  await Promise.all([solveOn(pato, third[0], false), solveOn(juli, third[1], true)]);

  await Promise.all([pato, juli].map((p) => p.page.getByText("Las batallas no cuentan para el ranking ni la corona").waitFor({ timeout: 30000 })));
  check("the podium came without waiting for Toto", true);
  await shot(pato, "tubitos-06-podio");
  const final = await state(pato, battleId);
  const rows = final.match.standings;
  check("the table counts 3 boards for Pato and Juli, 2 for Toto", rows.find((row) => row.solved === 2) !== undefined && rows.filter((row) => row.solved === 3).length === 2);
  check("the podium goes by points", rows.every((row, i) => i === 0 || rows[i - 1].score >= row.score));
  await finish(browser);
})().catch(fail);
