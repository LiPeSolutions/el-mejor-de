import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AVATAR_SPECIES, parseAvatar } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { avatarLook } from "./avatar";
import { drawCharacter, type Look, type SvgNode } from "./draw";
import { lookOf } from "./Personaje";

/*
 * The drawing against Claude Design's reference SVGs (docs/diseno/
 * handoff-personajes/svg), element by element: every species in every view
 * and pose, the 8 dressed-up examples and each option on its own.
 */

const SVG = fileURLToPath(new URL("../../../../../docs/diseno/handoff-personajes/svg", import.meta.url));
const DATA = fileURLToPath(new URL("../../../../../docs/diseno/handoff-personajes/datos", import.meta.url));

interface El {
  tag: string;
  attrs: Record<string, string>;
  children: El[];
  text: string;
}

/** Just enough XML for these files. */
function parse(xml: string): El {
  const root: El = { tag: "#", attrs: {}, children: [], text: "" };
  const stack = [root];
  const tags = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  for (const match of xml.replace(/<metadata>[\s\S]*?<\/metadata>/g, "").matchAll(tags)) {
    const [, closing, tag, attrText = "", selfClosing, text] = match;
    if (text !== undefined) {
      stack.at(-1)!.text += text;
      continue;
    }
    if (closing) {
      stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const [, name, value] of attrText.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[name!] = value!;
    const el: El = { tag: tag!, attrs, children: [], text: "" };
    stack.at(-1)!.children.push(el);
    if (!selfClosing) stack.push(el);
  }
  return root.children[0]!;
}

const fromDrawing = (node: SvgNode): El => ({
  tag: node.tag,
  attrs: Object.fromEntries(Object.entries(node.attrs).map(([name, value]) => [name, String(value)])),
  children: (node.children ?? []).map(fromDrawing),
  text: node.text ?? "",
});

/** One line per element: sorted attributes, numbers to 3 decimals, clip ids by their role. */
function canonical(el: El, depth = 0): string {
  const value = (raw: string) =>
    raw
      .replace(/#[\w-]*-(head|body|marco|badge)\b/g, (_, role: string) => `#${role === "marco" ? "badge" : role}`)
      .replace(/^[\w-]*-(head|body|marco|badge)$/, (_, role: string) => (role === "marco" ? "badge" : role))
      .replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => String(Math.round(Number(n) * 1000) / 1000));
  const attrs = Object.entries(el.attrs)
    .filter(([name]) => name !== "style")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, raw]) => `${name}=${value(raw)}`)
    .join(" ");
  const line = `${"  ".repeat(depth)}${el.tag}${attrs ? ` ${attrs}` : ""}${el.text.trim() ? ` "${el.text.trim()}"` : ""}`;
  return [line, ...el.children.map((child) => canonical(child, depth + 1))].join("\n");
}

/** The drawing's elements, without the sleeping "z" (the app keeps it; the reference files don't have it). */
function mine(look: Look): string {
  const drawing = drawCharacter(look, "t");
  const dropZ = (el: El): El => ({ ...el, children: el.children.filter((child) => !(child.tag === "text" && child.text === "z")).map(dropZ) });
  return drawing.children.map((child) => canonical(dropZ(fromDrawing(child)))).join("\n");
}

/** The reference file's elements, and its view box without the margin around it (14 % of the width, on every side). */
function reference(path: string): { body: string; viewBox: string } {
  const svg = parse(readFileSync(path, "utf8"));
  const [x, y, w, h] = svg.attrs.viewBox!.split(" ").map(Number) as [number, number, number, number];
  const width = w / 1.28;
  const margin = 0.14 * width;
  const viewBox = [x + margin, y + margin, width, h - 2 * margin].map((n) => Math.round(n * 10) / 10).join(" ");
  return { body: svg.children.map((child) => canonical(child)).join("\n"), viewBox };
}

const CELLS: Record<string, Pick<Look, "view" | "facing" | "pose" | "badge">> = {
  "01-frente": {},
  "02-tres-cuartos-der": { view: "threeQuarter", facing: "right" },
  "03-tres-cuartos-izq": { view: "threeQuarter", facing: "left" },
  "04-saludo": { pose: "wave" },
  "05-festejo": { pose: "cheer" },
  "06-salto": { pose: "jump" },
  "07-corona": { pose: "hugCrown" },
  "08-dormido": { pose: "sleep" },
  "09-avatar": { badge: true },
};

function expectSame(look: Look, file: string) {
  const ref = reference(file);
  expect(mine(look)).toBe(ref.body);
  const viewBox = drawCharacter(look, "t")
    .viewBox.split(" ")
    .map((n) => Math.round(Number(n) * 10) / 10)
    .join(" ");
  expect(viewBox).toBe(ref.viewBox);
}

describe("the 17 species, as in the model sheet", () => {
  for (const sp of AVATAR_SPECIES) {
    for (const [cell, options] of Object.entries(CELLS)) {
      it(`${sp} · ${cell}`, () => expectSame({ sp, ...options }, join(SVG, "especies", sp, `${cell}.svg`)));
    }
  }
});

describe("the 8 examples, dressed up", () => {
  const examples = JSON.parse(readFileSync(join(DATA, "avatares-ejemplo.json"), "utf8")) as { name: string; avatar: Record<string, unknown> }[];
  for (const { name, avatar: raw } of examples) {
    const { hasCrown, ...fields } = raw;
    // The examples leave out the first version's fields: their defaults.
    const avatar = parseAvatar({ color: "natural", accessory: null, ...fields });
    for (const file of readdirSync(join(SVG, "ejemplos", name))) {
      const cell = file.replace(/\.svg$/, "");
      it(`${name} · ${cell}`, () => {
        expect(avatar).not.toBeNull();
        // Out of the badge, the design leaves the background out.
        const options = CELLS[cell]!;
        const look = lookOf({ ...avatarLook(avatar!), crown: Boolean(hasCrown), ...options, ...(options.badge ? { badgeColor: avatar!.background } : {}) });
        expectSame(look, join(SVG, "ejemplos", name, file));
      });
    }
  }
});

describe("each option, on its own", () => {
  const ZONES: Record<string, keyof Look> = { ojos: "eyes", pelo: "hair", marcas: "marks", ropa: "outfit", cabeza: "head", cara: "faceWear", cuello: "neck", mano: "hand" };
  for (const file of readdirSync(join(SVG, "opciones"))) {
    const name = file.replace(/\.svg$/, "");
    const detail = /^detalle-(\w+)-sobre-gato-gris$/.exec(name);
    const [group, value] = name.split("-") as [string, string];
    const look: Look = detail
      ? { sp: "gato", colors: { main: "#9AA3B5", light: "#E4E7EE", dark: "#6C7489" }, detail: detail[1] as Look["detail"], marks: "rayas" }
      : name === "corona"
        ? { sp: "hornero", crown: true }
        : { sp: "hornero", [ZONES[group]!]: value };
    it(name, () => expectSame(look, join(SVG, "opciones", file)));
  }
});

describe("drawing", () => {
  it("draws every species in every pose, view and badge", () => {
    for (const sp of AVATAR_SPECIES) {
      for (const pose of ["idle", "wave", "cheer", "jump", "hugCrown", "sleep"] as const) {
        for (const view of ["front", "threeQuarter"] as const) {
          for (const badge of [false, true]) {
            const look: Look = { sp, pose, view, facing: "left", badge, hand: "mate", head: "gorra", neck: "bufanda", faceWear: "anteojos", outfit: "buzo", hair: "rulos", marks: "rayas", animate: true };
            expect(drawCharacter(look, "t").children.length).toBeGreaterThan(1);
          }
        }
      }
    }
  });

  it("moves the face to the side it looks to, in three-quarter view", () => {
    const front = mine({ sp: "zorro" });
    expect(front).not.toContain("translate(5.5 0)");
    expect(mine({ sp: "zorro", view: "threeQuarter", facing: "right" })).toContain("transform=translate(5.5 0)");
    expect(mine({ sp: "zorro", view: "threeQuarter", facing: "left" })).toContain("transform=translate(-5.5 0)");
  });

  it("hugs the crown instead of wearing it, with empty hands", () => {
    const hugging = mine({ sp: "carpincho", crown: true, hand: "mate", pose: "hugCrown" });
    const wearing = mine({ sp: "carpincho", crown: true, hand: "mate" });
    // The crown on the head has a dark band at y 18; the mate is brown.
    expect(wearing).toContain("fill=#8B5A2B");
    expect(hugging).not.toContain("fill=#8B5A2B");
    expect(wearing.match(/fill=#FFC53D/g)).toHaveLength(1);
    expect(hugging.match(/fill=#FFC53D/g)!.length).toBeGreaterThan(1);
  });

  it("leaves the floor's shadow on the floor when jumping", () => {
    const drawing = drawCharacter({ sp: "gato", pose: "jump" }, "t");
    const [, shadow, body] = drawing.children;
    expect(shadow!.attrs).toMatchObject({ cy: 116, rx: 16 });
    expect(body!.attrs.transform).toBe("translate(0 -10)");
  });

  it("keeps the sleeping z, and moves the arms only when it animates", () => {
    expect(JSON.stringify(drawCharacter({ sp: "hornero", pose: "sleep" }, "t"))).toContain('"text":"z"');
    expect(JSON.stringify(drawCharacter({ sp: "hornero", pose: "cheer" }, "t"))).not.toContain("swing");
    expect(JSON.stringify(drawCharacter({ sp: "hornero", pose: "cheer", animate: true }, "t"))).toContain("swing");
    expect(JSON.stringify(drawCharacter({ sp: "hornero", pose: "jump", animate: true }, "t"))).toContain("land");
    // In a badge, nothing moves.
    expect(JSON.stringify(drawCharacter({ sp: "hornero", pose: "cheer", animate: true, badge: true }, "t"))).not.toContain("swing");
  });

  it("names its clip paths after the ids it gets", () => {
    const drawing = JSON.stringify(drawCharacter({ sp: "rana", badge: true }, "abc"));
    expect(drawing).toContain('"id":"abc-head"');
    expect(drawing).toContain('"id":"abc-badge"');
    expect(drawing).toContain("url(#abc-body)");
  });
});
