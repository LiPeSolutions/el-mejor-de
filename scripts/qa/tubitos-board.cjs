// Tubitos played from the screen, as a person would: each tube's label says its colors, bottom to top.
const { wait, waterSortEngine } = require("./helpers.cjs");

const { solveWaterSort, WATER_SORT_RULES } = waterSortEngine();
/** The colors as the labels name them, in the engine's order. */
const NAMES = ["coral", "violeta", "turquesa", "amarillo", "rosa", "azul", "lima", "café"];

/** The board on screen, as the engine writes it (color indexes, bottom first). */
async function readBoard(page) {
  const labels = await page.locator('button[aria-label^="Tubo "]').evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")));
  return labels.map((label) => {
    if (/vacío/.test(label)) return [];
    const done = label.match(/listo: (.+)$/);
    if (done) return Array.from({ length: WATER_SORT_RULES.capacity }, () => NAMES.indexOf(done[1]));
    return label.split(": ")[1].replace(", puede recibir", "").split(", ").map((name) => NAMES.indexOf(name));
  });
}

const tube = (page, index) => page.locator(`button[aria-label^="Tubo ${index + 1},"]`);

/** Waits until no tube is in the air. */
async function settle(page, reduced) {
  await page.waitForFunction(() => !document.querySelector("button.z-30"), null, { timeout: 8000 });
  await wait(reduced ? 200 : 120);
}

/** Lifts `from` and pours it into `to`; `during` runs while it pours (a screenshot, say). */
async function pourStep(page, from, to, { reduced = false, during } = {}) {
  await tube(page, from).click();
  await page.locator(`button[aria-label^="Tubo ${from + 1},"][aria-pressed="true"]`).waitFor({ timeout: 4000 });
  await tube(page, to).click();
  if (during) {
    await wait(reduced ? 60 : 380);
    await during();
  }
  await settle(page, reduced);
}

/** The shortest solution of a board: `{ moves, path: [[from, to], …] }`. */
function solve(board) {
  const solved = solveWaterSort(board, WATER_SORT_RULES.capacity, WATER_SORT_RULES.solverLimit);
  if (!solved) throw new Error(`no solution for ${JSON.stringify(board)}`);
  return solved;
}

module.exports = { readBoard, tube, pourStep, solve };
