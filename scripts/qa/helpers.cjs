// Shared pieces of the browser checks: Playwright, simulated phones, accounts, screenshots and the report.
const fs = require("node:fs");
const path = require("node:path");

/** Where the app runs (`next dev -p 3100`, see README.md). */
const BASE = process.env.BASE || "http://localhost:3100";
/** Screenshots go here; the folder is ignored by git. */
const OUT = process.env.QA_OUT || path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

const ROOT = path.join(__dirname, "..", "..");

/** Playwright from PLAYWRIGHT_MODULE, from this folder, or the copy Claude's cloud machines bring. */
function playwright() {
  const places = [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node-tools/node_modules/playwright"].filter(Boolean);
  for (const place of places) {
    try {
      return require(place);
    } catch {
      // Try the next one.
    }
  }
  throw new Error("Playwright not found: install it (see scripts/qa/README.md) or set PLAYWRIGHT_MODULE");
}

/** The browser, with sound allowed without a tap (the battles' music). */
function launch() {
  return playwright().chromium.launch({ args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checks = [];
const errors = [];

/** One line of the report. */
function check(name, ok) {
  checks.push(`${ok ? "OK  " : "FAIL"} ${name}`);
}

/**
 * A simulated phone (or tablet) with its own cookies, so its own account.
 * `tag` prefixes its screenshots.
 */
async function phone(browser, name, { width = 390, height = 844, reducedMotion = "no-preference", tag } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 700,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: "es-AR",
    reducedMotion,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${name}: ${error}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/Failed to load resource|hydrat/i.test(message.text())) errors.push(`${name}: ${message.text().slice(0, 200)}`);
  });
  // Next.js' dev overlay would cover part of the screenshots.
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
  return { context, page, name, width, height, tag: tag ?? String(width) };
}

/** A new account on this phone (its cookie stays in the phone's context). */
async function signup(p, username, avatar, article = "el") {
  const response = await p.context.request.post(`${BASE}/api/cuenta/crear`, { data: { username, password: "una frase larga 123", avatar, article } });
  if (!response.ok()) throw new Error(`signup ${username}: ${response.status()} ${await response.text()}`);
  return (await response.json()).account;
}

/** A screenshot in OUT, saying whether the page overflows sideways or scrolls. */
async function shot(p, label) {
  await p.page.screenshot({ path: path.join(OUT, `${p.tag}-${label}.png`) });
  const wide = await p.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const tall = await p.page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  console.log("shot", label, wide ? "OVERFLOW-X" : "", tall ? "scrolls" : "");
  return { wide, tall };
}

/** A short random suffix, so every run creates new accounts. */
const suffix = () => Math.random().toString(36).slice(2, 5);

/** Prints the report and closes the browser; the exit code says if something failed. */
async function finish(browser) {
  console.log(checks.join("\n"));
  console.log("ERRORS", errors.length ? errors.join("\n") : "none");
  if (errors.length > 0 || checks.some((line) => line.startsWith("FAIL"))) process.exitCode = 1;
  await browser.close();
}

function fail(error) {
  console.error("FAILED", error);
  console.log(checks.join("\n"));
  console.log("ERRORS", errors.join("\n"));
  process.exit(1);
}

/** Tubitos' engine (with its solver), bundled from the TypeScript on each run. */
function waterSortEngine() {
  const outfile = path.join(__dirname, ".engine", "water-sort.cjs");
  require("esbuild").buildSync({
    entryPoints: [path.join(ROOT, "packages/games/src/games/water-sort.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile,
    logLevel: "warning",
  });
  return require(outfile);
}

module.exports = { BASE, OUT, launch, wait, check, phone, signup, shot, suffix, finish, fail, waterSortEngine };
