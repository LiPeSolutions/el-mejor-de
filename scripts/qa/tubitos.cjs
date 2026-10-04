// Tubitos end to end: practice, or with DAILY=1 the daily challenge's three levels. It reads the tubes and solves them.
// Usage: node scripts/qa/tubitos.cjs [width height]   REDUCED=1 for reduced motion. (see README.md)
const { BASE, launch, wait, check, phone, shot, finish, fail } = require("./helpers.cjs");
const { readBoard, tube, pourStep, solve } = require("./tubitos-board.cjs");

const width = Number(process.argv[2] || 390);
const height = Number(process.argv[3] || 844);
const reduced = process.env.REDUCED === "1";
const daily = process.env.DAILY === "1";

const movesShown = (page) => page.locator("text=Movimientos").locator("xpath=..").innerText();

/** Solves the level on screen; `pourShot` names a screenshot taken during the second pour. */
async function solveLevel(p, { pourShot, afterStep } = {}) {
  const { moves, path } = solve(await readBoard(p.page));
  for (const [i, [from, to]] of path.entries()) {
    await pourStep(p.page, from, to, { reduced, during: pourShot && i === 1 ? () => shot(p, pourShot) : undefined });
    if (afterStep) await afterStep(i);
  }
  return moves;
}

async function practice(p) {
  const { page } = p;
  await page.goto(`${BASE}/practicar`);
  await page.getByText("Tubitos").first().waitFor({ timeout: 20000 });
  await shot(p, "p01-practicar");
  await page.locator('a[href="/practicar/tubitos"]').click();
  await page.getByText("Los niveles no se terminan").waitFor({ timeout: 20000 });
  await shot(p, "p02-intro");
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByText("Tocá un tubo para levantarlo").waitFor({ timeout: 20000 });
  await wait(300);
  check("practice level 1 has 6 tubes", (await page.locator('button[aria-label^="Tubo "]').count()) === 6);
  check("the header says Nivel 1", (await page.getByText("Nivel 1", { exact: true }).count()) >= 1);
  const fit = await shot(p, "p03-nivel1");
  check("the board fits without scrolling", !fit.tall || height < 700);

  // Lifting a tube names its color and marks where it can go.
  let board = await readBoard(page);
  const first = board.findIndex((colors) => colors.length > 0);
  await tube(page, first).click();
  await page.getByText(/· elegí dónde pasarlo/).waitFor();
  check("lifting marks the targets", (await page.locator('button[aria-label$="puede recibir"]').count()) >= 1);
  await shot(p, "p04-elegido");
  // A tube that can't take it: a red toast, and the lifted one stays up.
  const refuse = board.findIndex((colors, i) => i !== first && colors.length > 0 && colors.at(-1) !== board[first].at(-1));
  if (refuse !== -1) {
    await tube(page, refuse).click();
    await page.getByText(/Ahí no ·/).waitFor();
    await shot(p, "p05-no-entra");
    check("the lifted tube stays up after a refusal", (await page.locator(`button[aria-label^="Tubo ${first + 1},"][aria-pressed="true"]`).count()) === 1);
  }
  await tube(page, first).click(); // Put it down.
  await wait(200);

  // Undo and restart.
  board = await readBoard(page);
  const [from, to] = solve(board).path[0];
  await pourStep(page, from, to, { reduced, during: () => shot(p, "p06-vertiendo") });
  check("a pour counts one move", (await movesShown(page)).includes("1"));
  await page.getByRole("button", { name: /Deshacer/ }).click();
  await wait(250);
  check("undo keeps the move count", (await movesShown(page)).includes("1"));
  check("undo brings the board back", JSON.stringify(await readBoard(page)) === JSON.stringify(board));
  await page.getByRole("button", { name: /Reiniciar/ }).click();
  await wait(250);
  check("restart puts the moves at 0", (await movesShown(page)).includes("0"));

  // Solve it.
  let corkShot = false;
  const moves = await solveLevel(p, {
    afterStep: async () => {
      if (!corkShot && (await page.getByText(/¡Tubo listo! · faltan/).count())) {
        corkShot = true;
        await shot(p, "p07-tubo-listo");
      }
    },
  });
  await page.getByText("¡Nivel 1 listo!").waitFor({ timeout: 8000 });
  await wait(reduced ? 200 : 1600);
  await shot(p, "p08-victoria");
  check("the victory shows the par", (await page.getByText(`El mínimo era ${moves}`).count()) === 1);
  check("the record is level 1", (await page.getByText("Nivel 1", { exact: true }).count()) >= 1);
  check("the record is saved", (await page.evaluate(() => JSON.parse(localStorage.getItem("emd:practica"))["water-sort"].best)) === 1);

  // Repeat, then the next level.
  await page.getByRole("button", { name: "Repetir nivel" }).click();
  await page.getByText("Tocá un tubo para levantarlo").waitFor();
  check("repeating gives the same board", JSON.stringify(await readBoard(page)) === JSON.stringify(board));
  await solveLevel(p);
  await page.getByText("¡Nivel 1 listo!").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: /Siguiente nivel/ }).click();
  await page.getByText("Tocá un tubo para levantarlo").waitFor();
  check("practice goes on to level 2", (await page.getByText("Nivel 2", { exact: true }).count()) >= 1);
  await shot(p, "p09-nivel2");

  // Leaving practice doesn't ask; coming back goes on after the record.
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL(/\/practicar$/);
  await page.getByText("Nivel 1").first().waitFor();
  await shot(p, "p10-practicar-record");
  await page.locator('a[href="/practicar/tubitos"]').click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByText("Tocá un tubo para levantarlo").waitFor();
  check("a new run starts after the record", (await page.getByText("Nivel 2", { exact: true }).count()) >= 1);
}

async function dailyChallenge(p) {
  const { page } = p;
  await page.goto(`${BASE}/jugar/tubitos`);
  await page.locator("text=/Reto \\d de 3|descansa|se estrena/").first().waitFor({ timeout: 20000 });
  if (!(await page.getByText(/Reto \d de 3/).count())) {
    // Tubitos plays 3 days out of 5, from 5/10/2026.
    console.log("SKIP: Tubitos isn't in today's challenge");
    return;
  }
  await shot(p, "d01-intro");
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByText("Tocá un tubo para levantarlo").waitFor({ timeout: 20000 });
  await wait(300);
  await shot(p, "d02-nivel1");
  for (let level = 1; level <= 3; level++) {
    check(`level ${level} has ${4 + 2 * level} tubes`, (await page.locator('button[aria-label^="Tubo "]').count()) === 4 + 2 * level);
    if (level === 3) {
      // Using the three undos turns the button off.
      const [from, to] = solve(await readBoard(page)).path[0];
      for (let i = 0; i < 3; i++) {
        await pourStep(page, from, to, { reduced });
        await page.getByRole("button", { name: /Deshacer/ }).click();
        await wait(250);
      }
      await shot(p, "d05-sin-deshacer");
    }
    await solveLevel(p, { pourShot: level === 2 && !reduced ? "d03-vertiendo-8" : undefined });
    if (level < 3) {
      await page.getByText(`¡Nivel ${level} listo!`).waitFor({ timeout: 8000 });
      await page.getByText(/^\+\d+$/).waitFor({ timeout: 8000 });
      await wait(reduced ? 200 : 1600);
      await shot(p, `d0${level === 1 ? 4 : 6}-victoria-${level}`);
      await page.getByRole("button", { name: /Siguiente nivel/ }).click();
      await page.getByText("Tocá un tubo para levantarlo").waitFor({ timeout: 10000 });
      await wait(300);
      if (level === 1) await shot(p, "d04b-nivel2");
    }
  }
  await page.waitForURL(/\/jugar\/tubitos\/resultado/, { timeout: 20000 });
  await page.getByText("Resolviste los 3 niveles").waitFor({ timeout: 10000 });
  check("the result says the 3 levels were solved", true);
  await wait(1500);
  await shot(p, "d07-resultado");
  console.log("result line:", await page.locator("text=el mínimo era").locator("xpath=..").innerText());
  // The day's tiles, with Tubitos played.
  await page.goto(`${BASE}/`);
  await page.getByText("Tubitos").first().waitFor({ timeout: 15000 });
  await wait(800);
  await shot(p, "d08-inicio");
}

(async () => {
  const browser = await launch();
  const p = await phone(browser, "tubitos", { width, height, reducedMotion: reduced ? "reduce" : "no-preference", tag: `${width}${reduced ? "-rm" : ""}` });
  if (daily) await dailyChallenge(p);
  else await practice(p);
  await finish(browser);
})().catch(fail);
