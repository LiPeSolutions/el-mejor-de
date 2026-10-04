// The character editor (design 18, docs/diseno/handoff-editor): creating the account in steps and editing with autosave.
// Usage: node scripts/qa/editor.cjs [width] [height]   (REDUCED=1 for reduced motion)
const { BASE, launch, wait, check, phone, signup, shot, suffix, finish, fail } = require("./helpers.cjs");

const width = Number(process.argv[2]) || 390;
const height = Number(process.argv[3]) || 844;
const reducedMotion = process.env.REDUCED ? "reduce" : "no-preference";

/** The cell (its label) of an option, inside its section. */
const cell = (page, section, option) => page.getByRole("group", { name: section, exact: true }).locator("label").filter({ has: page.getByRole("radio", { name: option, exact: true }) });
const radio = (page, section, option) => page.getByRole("group", { name: section, exact: true }).getByRole("radio", { name: option, exact: true });
const tab = (page, name) => page.getByRole("navigation", { name: "Partes del personaje" }).getByRole("button", { name, exact: true });
const activeTab = (page) => page.locator('nav[aria-label="Partes del personaje"] [aria-current="true"]').innerText();
const SPECIES_IDS = {
  Carpincho: "carpincho", Hornero: "hornero", Pingüino: "pinguino", Zorro: "zorro", Rana: "rana", Llama: "llama", Pelusa: "pelusa", Ñoqui: "nioqui", Yaguareté: "yaguarete",
  Tero: "tero", Mulita: "mulita", Cóndor: "condor", Ñandú: "nandu", "Oso hormiguero": "oso", Vizcacha: "vizcacha", Perro: "perro", Gato: "gato",
};
const me = (page) => page.evaluate(() => fetch("/api/cuenta").then((response) => response.json()));
/** Where the card is (its title: the character itself floats up and down). */
const cardBox = (page) => page.locator("h1").first().boundingBox();
/** Whether a control is in an open section (a closed one keeps its size, inert, in a row of height 0). */
const shown = async (locator) => (await locator.count()) > 0 && !(await locator.first().evaluate((element) => Boolean(element.closest("[inert]"))));
const listTop = (page) => page.evaluate(() => document.querySelector('nav[aria-label="Partes del personaje"]').nextElementSibling.scrollTop);

async function createFlow(browser) {
  const p = await phone(browser, "crear", { width, height, reducedMotion });
  const { page } = p;
  await page.goto(`${BASE}/cuenta/personaje?volver=%2F`);
  await page.getByText("Paso 1 de 3").waitFor();
  await wait(500);
  await shot(p, "editor-01-crear-bicho");
  check("create starts in the editor, step 1 of 3", await page.getByText("Paso 1 de 3").isVisible());
  check("Deshacer starts off", await page.getByRole("button", { name: "Deshacer" }).isDisabled());
  const species = await page.getByRole("group", { name: "Elegí tu bicho" }).getByRole("radio", { checked: true }).getAttribute("aria-label");
  check(`starts with a random species, natural and with nothing on (${species})`, Boolean(species) && (await radio(page, "Color del cuerpo", "Natural").isChecked()));

  // The tabs take the list to their part, and the card doesn't move.
  const before = await cardBox(page);
  await tab(page, "Cara").click();
  await wait(reducedMotion === "reduce" ? 100 : 900);
  check("Cara takes the list to the face", (await listTop(page)) > 100 && (await activeTab(page)) === "Cara");
  await shot(p, "editor-02-crear-cara");
  const after = await cardBox(page);
  check("the card stays where it was", Math.abs(before.y - after.y) < 1);

  // Scrolling by hand moves the tab.
  await page.evaluate(() => {
    const list = document.querySelector('nav[aria-label="Partes del personaje"]').nextElementSibling;
    const ropa = [...list.querySelectorAll("section")].find((section) => section.getAttribute("aria-label") === "Ropa");
    list.scrollTo({ top: ropa.offsetTop - 16 + 40, behavior: "instant" });
  });
  await wait(300);
  check("scrolling to the clothes marks Ropa", (await activeTab(page)) === "Ropa");
  await page.evaluate(() => {
    const list = document.querySelector('nav[aria-label="Partes del personaje"]').nextElementSibling;
    list.scrollTo({ top: list.scrollHeight, behavior: "instant" });
  });
  await wait(300);
  check("at the bottom, Fondo", (await activeTab(page)) === "Fondo");

  // Choosing: the number shows with the shirt, a burst of taps goes back in one.
  await tab(page, "Bicho").click();
  await wait(900);
  const other = species === "Zorro" ? "Gato" : "Zorro";
  await cell(page, "Elegí tu bicho", other).click();
  check("choosing a species", await radio(page, "Elegí tu bicho", other).isChecked());
  check("Deshacer turns on", await page.getByRole("button", { name: "Deshacer" }).isEnabled());
  check("Número is hidden without the shirt", !(await shown(page.getByRole("button", { name: "Uno más" }))));
  await cell(page, "Ropa", "Camiseta").click();
  await wait(300);
  check("Color de la ropa shows with clothes", await shown(radio(page, "Color de la ropa", "Azul")));
  const plus = page.getByRole("button", { name: "Uno más" });
  await plus.click();
  await plus.click();
  await plus.click();
  check("the number goes up", (await page.locator("output").innerText()) === "13");
  await shot(p, "editor-03-crear-ropa");
  await wait(400);
  await page.getByRole("button", { name: "Deshacer" }).click();
  check("one Deshacer takes back the whole burst", (await page.locator("output").innerText()) === "10");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await wait(300);
  check("and the next one, the shirt (Número closes)", (await radio(page, "Ropa", "Nada").isChecked()) && !(await shown(plus)));
  await page.getByRole("button", { name: "Deshacer" }).click();
  check("back to the first species", await radio(page, "Elegí tu bicho", species).isChecked());

  // The hat and the hair.
  await cell(page, "Cabeza", "Boina").click();
  await wait(300);
  const notice = page.getByText("La boina tapa el pelo.");
  check("the hat notice shows in Pelo", await shown(notice));
  await notice.scrollIntoViewIfNeeded();
  await shot(p, "editor-04-crear-boina");
  await page.getByRole("button", { name: "Sacar la boina" }).click();
  await wait(300);
  check("«Sacar la boina» takes it off", (await radio(page, "Cabeza", "Nada").isChecked()) && !(await shown(notice)));

  // Painting the face brings the clothes' color.
  await cell(page, "Cara", "Pintada").click();
  await wait(300);
  check("the face paint shows Color de la ropa", await shown(radio(page, "Color de la ropa", "Azul")));
  await cell(page, "Cara", "Nada").click();

  // Al azar.
  await page.getByRole("button", { name: "Al azar" }).click();
  const shuffled = await page.getByRole("group", { name: "Elegí tu bicho" }).getByRole("radio", { checked: true }).getAttribute("aria-label");
  check(`Al azar changes the species (${shuffled})`, shuffled !== species);
  await tab(page, "Fondo").click();
  await wait(900);
  await shot(p, "editor-05-crear-fondo");
  check("the ranking row says «Tu apodo»", await page.getByText("Tu apodo").isVisible());

  // Step 2, and back without losing anything.
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByText("Paso 2 de 3").waitFor();
  await page.getByLabel("Tu apodo").fill(`edit${suffix()}`);
  await page.getByLabel("Contraseña", { exact: true }).fill("una frase larga 123");
  await wait(600);
  await shot(p, "editor-06-crear-paso2");
  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByText("Paso 1 de 3").waitFor();
  check("the arrow goes back to step 1 with the same character", await radio(page, "Elegí tu bicho", shuffled).isChecked());
  check("and Deshacer still works", await page.getByRole("button", { name: "Deshacer" }).isEnabled());
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByText("Paso 2 de 3").waitFor();
  check("the apodo is still there", (await page.getByLabel("Tu apodo").inputValue()).startsWith("edit"));
  await page.goBack();
  await page.getByText("Paso 1 de 3").waitFor({ timeout: 3000 }).catch(() => {});
  check("the phone's back goes to step 1 too", await page.getByText("Paso 1 de 3").isVisible());
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByText("Paso 2 de 3").waitFor();
  const username = await page.getByLabel("Tu apodo").inputValue();
  await page.getByText("El Mejor de…").click();
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await page.waitForURL(/\/cuenta\/lugar/, { timeout: 20000 });
  await page.getByText("Paso 3 de 3").waitFor();
  check("the place is step 3 of 3", true);
  const { account } = await me(page);
  check(`the account has the character (${account.avatar.species})`, account.username === username && account.avatar.species === SPECIES_IDS[shuffled]);
  // Back from the place: the account is made, so not the signup again.
  await page.goBack();
  await wait(2500);
  check(`back from the place doesn't show the signup again (${new URL(page.url()).pathname})`, !(await page.getByText("Paso 1 de 3").isVisible().catch(() => false)));
  await p.context.close();
}

async function groupChip(browser) {
  const p = await phone(browser, "grupo", { width, height, reducedMotion });
  await p.page.goto(`${BASE}/cuenta/personaje?volver=${encodeURIComponent("/g/ABC123")}`);
  await p.page.getByText("Paso 1 de 2").waitFor();
  check("joining a group: step 1 of 2", true);
  await p.page.getByRole("button", { name: "Seguir" }).click();
  check("and 2 of 2", await p.page.getByText("Paso 2 de 2").isVisible());
  await p.context.close();
}

async function editFlow(browser) {
  const p = await phone(browser, "editar", { width, height, reducedMotion });
  const { page } = p;
  const name = `feli${suffix()}`;
  // A first-version character: the boina goes to the head.
  await signup(p, name, { species: "mulita", color: "natural", accessory: "boina" });
  // From the profile, as a player gets there (Volver goes back to it).
  await page.goto(`${BASE}/perfil`);
  await page.getByRole("link", { name: "Editar personaje" }).click();
  await page.waitForURL(/\/cuenta\/personaje/);
  await page.getByRole("radiogroup", { name: "Cómo te nombramos" }).waitFor();
  await wait(500);
  check("editing shows the apodo on the card", await page.getByRole("heading", { name }).isVisible());
  check("the old accessory shows chosen in its zone", await radio(page, "Cabeza", "Boina").isChecked());
  check("no save button and no Seguir", !(await page.getByRole("button", { name: /Guardar|Seguir/ }).count()));
  await shot(p, "editor-07-editar");

  await cell(page, "Ropa", "Camiseta").click();
  await page.getByText("Guardando…").waitFor({ timeout: 2000 });
  check("a change shows «Guardando…»", true);
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 5000 });
  check("and then «Guardado»", true);
  await shot(p, "editor-08-guardado");
  let { account } = await me(page);
  check("saved with the zones spelled out and no old accessory", account.avatar.outfit === "camiseta" && account.avatar.head === "boina" && account.avatar.accessory === null);
  await page.getByText("Editar personaje").waitFor({ timeout: 4000 });
  check("2 s later, back to «Editar personaje»", true);

  await page.getByRole("radiogroup", { name: "Cómo te nombramos" }).getByText("La", { exact: true }).click();
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 5000 });
  ({ account } = await me(page));
  check("El / La on the card is saved too", account.article === "la");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 5000 });
  ({ account } = await me(page));
  check("Deshacer is saved", account.article === "el");

  // Without connection: it says so and tries again when it comes back.
  await p.context.setOffline(true);
  await cell(page, "Mano", "Mate").click();
  await page.getByText("Sin conexión").waitFor({ timeout: 5000 });
  check("offline: «Sin conexión»", true);
  await shot(p, "editor-09-sin-conexion");
  await p.context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.getByText("Guardado", { exact: true }).waitFor({ timeout: 5000 });
  ({ account } = await me(page));
  check("back online, it's saved", account.avatar.hand === "mate");

  // Volver right after a change: it sends it and then leaves.
  await cell(page, "Cuello", "Bufanda").click();
  await page.getByRole("button", { name: "Volver" }).click();
  await page.waitForURL(/\/perfil/, { timeout: 5000 });
  ({ account } = await me(page));
  check("Volver doesn't lose the last change", account.avatar.neck === "bufanda");

  // Volver without connection: it stays and says so; a second tap leaves.
  await page.getByRole("link", { name: "Editar personaje" }).click();
  await page.waitForURL(/\/cuenta\/personaje/);
  await page.getByRole("radiogroup", { name: "Cómo te nombramos" }).waitFor();
  await p.context.setOffline(true);
  await cell(page, "Cuello", "Collar").click();
  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByText("No se guardó tu personaje").waitFor({ timeout: 5000 });
  check("offline Volver stays, with the toast", page.url().includes("/cuenta/personaje"));
  await shot(p, "editor-10-no-se-guardo");
  await page.getByRole("button", { name: "Volver" }).click();
  await page.waitForURL(/\/perfil/, { timeout: 5000 }).catch(() => {});
  check("a second Volver leaves anyway", page.url().includes("/perfil"));
  await p.context.setOffline(false);
  await p.context.close();
}

/**
 * How long a change of species takes, measured inside the page with the CPU 4 times slower (a mid-range
 * phone): until the next frame (the card and the ring answer), and until the cells have drawn it too.
 */
async function speed(browser) {
  const p = await phone(browser, "velocidad", { width, height, reducedMotion });
  const { page } = p;
  await page.goto(`${BASE}/cuenta/personaje?volver=%2F`);
  await page.getByText("Paso 1 de 3").waitFor();
  await wait(500);
  const cdp = await p.context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const times = await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    const eyes = () => document.querySelector('input[aria-label="Redondos"]').nextElementSibling.innerHTML;
    const answer = [];
    const settle = [];
    // A first change to warm up (the first time is slower everywhere).
    const warm = document.querySelector('input[aria-label="Pelusa"]').checked ? "Perro" : "Pelusa";
    document.querySelector(`input[aria-label="${warm}"]`).click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const name of ["Zorro", "Gato", "Llama", "Tero", "Rana"]) {
      const input = document.querySelector(`input[aria-label="${name}"]`);
      if (input.checked || answer.length === 4) continue;
      const before = eyes();
      const start = performance.now();
      input.click();
      await frame();
      answer.push(Math.round(performance.now() - start));
      while (eyes() === before && performance.now() - start < 5000) await frame();
      settle.push(Math.round(performance.now() - start));
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    return { answer, settle };
  });
  console.log("species change, ms (CPU ×4): next frame", times.answer.join(", "), "· cells drawn", times.settle.join(", "));
  check(`a species change reaches the next frame in under 120 ms on a slow phone (${Math.max(...times.answer)} ms)`, Math.max(...times.answer) < 120);
  check(`and the cells follow in under 800 ms (${Math.max(...times.settle)} ms)`, Math.max(...times.settle) < 800);
  await p.context.close();
}

(async () => {
  const browser = await launch();
  try {
    await createFlow(browser);
    await groupChip(browser);
    await editFlow(browser);
    await speed(browser);
  } catch (error) {
    await browser.close();
    fail(error);
  }
  await finish(browser);
})();
