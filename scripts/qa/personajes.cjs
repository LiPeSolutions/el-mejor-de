// Characters 2.0: the dev model sheet (/dev/personajes) against Claude Design's reference SVGs, pixel by pixel, plus a screenshot of each.
// Usage: node scripts/qa/personajes.cjs   (see README.md; it needs `next dev`, not a database)
const fs = require("node:fs");
const path = require("node:path");
const { BASE, OUT, launch, check, finish, fail } = require("./helpers.cjs");

const SVG = path.join(__dirname, "..", "..", "docs", "diseno", "handoff-personajes", "svg");
/** Share of a cell's pixels that may differ (antialiasing, the app's font in the shirt number). */
const TOLERANCE = 0.006;

(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text().slice(0, 200)));
  await page.goto(`${BASE}/dev/personajes`);
  await page.getByText("Hoja de modelos").first().waitFor({ timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.screenshot({ path: path.join(OUT, "personajes-hoja.png"), fullPage: true });

  // Every clip path a character uses is in the page, once.
  const ids = await page.evaluate(() => {
    const used = [...document.querySelectorAll("[clip-path]")].map((el) => /url\(#([^)]+)\)/.exec(el.getAttribute("clip-path"))?.[1]);
    const defined = [...document.querySelectorAll("clipPath")].map((el) => el.id);
    return { missing: used.filter((id) => !defined.includes(id)).length, repeated: defined.length - new Set(defined).size, used: used.length };
  });
  check(`every clip path is defined (${ids.used} uses)`, ids.missing === 0);
  check("no clip path id is repeated", ids.repeated === 0);

  // Each cell next to its reference file, both as images at the same size, padded like the reference (14 % of the width).
  const cells = await page.$$eval("[data-reference]", (tds) => tds.map((td) => ({ file: td.dataset.reference, svg: td.querySelector("svg").outerHTML })));
  check(`the sheet has its 17 × 9 cells and the 8 examples' 6 (${cells.length})`, cells.length === 17 * 9 + 8 * 6);
  const pairs = cells.map(({ file, svg }) => ({ file, mine: svg, reference: fs.readFileSync(path.join(SVG, `${file}.svg`), "utf8").replace(/<metadata>[\s\S]*?<\/metadata>/, "") }));
  const results = await page.evaluate(async (list) => {
    const pad = (markup) => {
      const doc = new DOMParser().parseFromString(markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'), "image/svg+xml");
      const svg = doc.documentElement;
      const [x, y, w, h] = svg.getAttribute("viewBox").split(" ").map(Number);
      const p = w * 0.14;
      svg.setAttribute("viewBox", `${x - p} ${y - p} ${w + 2 * p} ${h + 2 * p}`);
      svg.setAttribute("width", String(w + 2 * p));
      svg.setAttribute("height", String(h + 2 * p));
      return new XMLSerializer().serializeToString(svg);
    };
    const pixels = (markup, width, height) =>
      new Promise((resolve, reject) => {
        const img = new Image(width, height);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(ctx.getImageData(0, 0, width, height).data);
        };
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
      });
    const out = [];
    for (const { file, mine, reference } of list) {
      const box = new DOMParser().parseFromString(reference, "image/svg+xml").documentElement.getAttribute("viewBox").split(" ").map(Number);
      const width = 128;
      const height = Math.round((width * box[3]) / box[2]);
      const [a, b] = await Promise.all([pixels(pad(mine), width, height), pixels(reference, width, height)]);
      let off = 0;
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]);
        if (d > 48) off += 1;
      }
      out.push({ file, share: off / (width * height) });
    }
    return out;
  }, pairs);
  // Asleep, the app keeps the first version's "z": the reference files don't draw it.
  const awake = results.filter((one) => !one.file.endsWith("08-dormido"));
  const asleep = results.filter((one) => one.file.endsWith("08-dormido"));
  const worst = (list) => list.reduce((max, one) => (one.share > max.share ? one : max), { file: "-", share: 0 });
  const bad = awake.filter((one) => one.share > TOLERANCE);
  for (const one of bad) console.log("differs", one.file, (one.share * 100).toFixed(2) + "%");
  check(`every awake cell looks like its reference (worst ${worst(awake).file}: ${(worst(awake).share * 100).toFixed(2)} %)`, bad.length === 0);
  check(`asleep, only the z differs (worst ${worst(asleep).file}: ${(worst(asleep).share * 100).toFixed(2)} %)`, asleep.every((one) => one.share < 0.02));
  check("the page has no errors", errors.length === 0);
  for (const error of errors) console.log("error", error);
  await finish(browser);
})().catch(fail);
