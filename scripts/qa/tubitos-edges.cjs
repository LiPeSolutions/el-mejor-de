// Tubitos' daily challenge, leaving early: from the victory between levels, and closing the app mid-level.
// Usage: node scripts/qa/tubitos-edges.cjs   (only on days Tubitos is in the challenge; see README.md)
const { BASE, launch, wait, check, phone, shot, finish, fail } = require("./helpers.cjs");
const { readBoard, pourStep, solve } = require("./tubitos-board.cjs");

const options = { reducedMotion: "reduce" };

/** Opens the challenge and starts level 1; false if Tubitos rests today. */
async function start(p) {
  await p.page.goto(`${BASE}/jugar/tubitos`);
  await p.page.locator("text=/Reto \\d de 3|descansa|se estrena/").first().waitFor({ timeout: 20000 });
  if (!(await p.page.getByText(/Reto \d de 3/).count())) return false;
  await p.page.getByRole("button", { name: /Empezar/ }).click();
  await p.page.getByText("Tocá un tubo para levantarlo").waitFor({ timeout: 20000 });
  await wait(300);
  return true;
}

(async () => {
  const browser = await launch();

  // 1. Leaving from level 1's victory: it counts with what was played.
  const a = await phone(browser, "a", options);
  if (!(await start(a))) {
    console.log("SKIP: Tubitos isn't in today's challenge");
    return finish(browser);
  }
  for (const [from, to] of solve(await readBoard(a.page)).path) await pourStep(a.page, from, to, { reduced: true });
  await a.page.getByText("¡Nivel 1 listo!").waitFor({ timeout: 8000 });
  await a.page.getByRole("button", { name: "Volver al inicio" }).click();
  await a.page.getByText("¿Seguro que querés salir?").waitFor();
  await shot(a, "e1-salir");
  await a.page.getByRole("button", { name: "Salir", exact: true }).click();
  await a.page.waitForURL(/resultado/, { timeout: 15000 });
  await a.page.getByText("Resolviste 1 de 3 niveles").waitFor({ timeout: 10000 });
  await wait(1200);
  await shot(a, "e2-resultado-1-de-3");
  check("leaving after level 1 keeps level 1", (await a.page.getByText("sin resolver").count()) === 2);
  // Opening it again goes to the result: one attempt.
  await a.page.goto(`${BASE}/jugar/tubitos`);
  await a.page.waitForURL(/resultado/, { timeout: 15000 });
  check("the challenge can't be played twice", a.page.url().includes("/resultado"));

  // 2. Closing the app halfway through level 1: it's graded with what the server has.
  const b = await phone(browser, "b", options);
  await start(b);
  const { path } = solve(await readBoard(b.page));
  await pourStep(b.page, ...path[0], { reduced: true });
  await pourStep(b.page, ...path[1], { reduced: true });
  await b.page.reload();
  await b.page.waitForURL(/resultado/, { timeout: 15000 });
  await b.page.getByText("No resolviste el nivel 1").waitFor({ timeout: 10000 });
  await wait(1200);
  await shot(b, "e3-resultado-0");
  check("closing mid-level counts as played, with 0", (await b.page.getByText("Ningún nivel resuelto").count()) === 1);

  await finish(browser);
})().catch(fail);
