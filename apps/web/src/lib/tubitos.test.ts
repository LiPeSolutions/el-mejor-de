import { describe, expect, it } from "vitest";
import { LIQUIDS, boardLayout, clockText, pourPose, rowsFor, runsOf, surfaceY, tippedLiquid, tubeLabel } from "./tubitos";

describe("boardLayout", () => {
  it("has the design's measures on a phone (§5.1)", () => {
    const six = boardLayout(6, { width: 350 });
    expect(six).toMatchObject({ width: 350, height: 434, tubeHeight: 160 });
    expect(six.tubes.slice(0, 3).map((tube) => tube.x)).toEqual([48, 146, 244]);
    expect(six.tubes[3]).toMatchObject({ y: 56 + 160 + 44, row: 1 });
    expect(six.racks[0]).toEqual({ x: 32, y: 56 + 160 - 10, width: 254 + 32 });
    expect(boardLayout(8, { width: 350 })).toMatchObject({ height: 422, tubeHeight: 154 });
    const ten = boardLayout(10, { width: 350 });
    expect(ten).toMatchObject({ height: 402, tubeHeight: 144 });
    // Each column is a whole touch zone: 66 × 190 px with 10 tubes.
    expect(ten.zones[0]).toMatchObject({ width: 66, height: 190 });
  });

  it("grows on a tablet", () => {
    const tablet = boardLayout(10, { width: 760, tablet: true });
    expect(tablet).toMatchObject({ width: 700, height: 712, tubeHeight: 270 });
    expect(tablet.size).toMatchObject({ tube: 78, layer: 60, icon: 22 });
  });

  it("lowers the layers 4 px on short screens, and more if it still doesn't fit", () => {
    expect([6, 8, 10].map((count) => boardLayout(count, { width: 350, short: true }).size.layer)).toEqual([30, 29, 27]);
    const tight = boardLayout(6, { width: 350, short: true, height: 340 });
    expect(tight.height).toBeLessThanOrEqual(340);
    expect(tight.size.layer).toBeGreaterThanOrEqual(22);
    expect(tight.zones.every((zone) => zone.height >= 44)).toBe(true);
  });

  it("fits narrow phones, keeping touch zones of 44 px or more", () => {
    const narrow = boardLayout(10, { width: 280 });
    expect(narrow.width).toBe(280);
    const lastOfRow = narrow.tubes[4]!;
    expect(lastOfRow.x + narrow.size.tube + 16).toBeLessThanOrEqual(280);
    expect(narrow.zones.every((zone) => zone.width >= 44)).toBe(true);
  });

  it("puts up to five tubes in a row, and one more on top when odd", () => {
    expect(rowsFor(5)).toEqual([5]);
    expect(rowsFor(7)).toEqual([4, 3]);
    expect(rowsFor(10)).toEqual([5, 5]);
  });

  it("never lets the zones of two rows overlap", () => {
    const layout = boardLayout(6, { width: 350 });
    const firstRowBottom = layout.zones[0]!.y + layout.zones[0]!.height;
    expect(layout.zones[3]!.y).toBeGreaterThanOrEqual(firstRowBottom);
  });
});

describe("pouring", () => {
  const layout = boardLayout(6, { width: 350 });

  it("tips the tube toward the target, its lip 12 px above the target's mouth", () => {
    const right = pourPose(layout, 0, 2);
    expect(right).toMatchObject({ theta: 95, side: 1, lipX: 244 + 29, lipY: 56 - 12 });
    expect(pourPose(layout, 2, 0)).toMatchObject({ theta: -95, side: -1 });
  });

  it("keeps the tipped liquid level: deeper at the mouth", () => {
    const full = tippedLiquid([{ color: 0, amount: 2 }, { color: 1, amount: 2 }], 154, 1);
    expect(full.clip).toBe("polygon(4% 0, 100% 0, 100% 100%, 52% 100%)");
    // The top color is nearest the mouth.
    expect(full.bands[1]!.top).toBe(0);
    expect(full.bands[0]!.top).toBe(77);
    expect(tippedLiquid([{ color: 0, amount: 0 }], 154, -1).bands[0]!.height).toBe(0);
  });

  it("knows where a tube's liquid ends", () => {
    expect(surfaceY(layout, 0, 0)).toBe(56 + 160);
    expect(surfaceY(layout, 0, 4)).toBe(56 + 160 - 4 * 34);
  });

  it("draws layers of the same color as one block", () => {
    expect(runsOf([0, 0, 1, 1])).toEqual([
      { color: 0, amount: 2 },
      { color: 1, amount: 2 },
    ]);
  });
});

describe("words", () => {
  it("names each tube's colors for screen readers", () => {
    expect(tubeLabel(2, [0, 3, 2], 4)).toBe("Tubo 3, de abajo hacia arriba: coral, amarillo, turquesa");
    expect(tubeLabel(5, [], 4, true)).toBe("Tubo 6, vacío, puede recibir");
    expect(tubeLabel(1, [1, 1, 1, 1], 4)).toBe("Tubo 2, listo: violeta");
  });

  it("has a name, a color and an icon for each of the eight liquids", () => {
    expect(LIQUIDS.map((liquid) => liquid.name)).toEqual(["Coral", "Violeta", "Turquesa", "Amarillo", "Rosa", "Azul", "Lima", "Café"]);
    expect(new Set(LIQUIDS.map((liquid) => liquid.Icon)).size).toBe(8);
  });

  it("shows the clock in m:ss", () => {
    expect(clockText(41_000)).toBe("0:41");
    expect(clockText(106_400)).toBe("1:46");
    expect(clockText(-5)).toBe("0:00");
  });
});
