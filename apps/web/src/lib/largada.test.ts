import { describe, expect, it } from "vitest";
import { RACE, aName, bestStart, deName, departures, namesList, noseAt, ordinal, photoCaption, placements, raceEndMs, startSummary, startsOf, type Runner } from "./largada";

const hit = (reactionMs: number) => ({ reactionMs, falseStart: false });
const jumped = { reactionMs: null, falseStart: true };
const missed = { reactionMs: null, falseStart: false };
const MAX = 1500;

describe("the race", () => {
  it("leaves the first car at once and the others 6 ms later per ms, up to 600", () => {
    expect(departures([hit(231), hit(218), hit(256), jumped, missed], MAX)).toEqual([78, 0, 228, null, 600]);
    expect(departures([jumped], MAX)).toEqual([null]);
  });

  it("moves the nose from the start to the finish in 1.4 s, then straight on", () => {
    expect(noseAt(0, 0)).toBe(RACE.startX);
    expect(noseAt(RACE.raceMs, 0)).toBe(RACE.finishX);
    expect(noseAt(700, 0)).toBeCloseTo(192 + 170 / 4);
    expect(noseAt(RACE.raceMs + 100, 0)).toBeCloseTo(362 + (340 / 1400) * 100);
    expect(noseAt(5000, null)).toBe(RACE.startX);
    // 13 ms behind reads as about 19 px at the finish.
    expect(RACE.finishX - noseAt(RACE.raceMs, 78)).toBeCloseTo(18.4, 0);
    expect(raceEndMs([78, 0, null])).toBe(78 + RACE.raceMs);
  });

  it("places by time, sharing ties, with a jumped start last", () => {
    expect(placements([hit(231), hit(218), hit(231), jumped, missed], MAX)).toEqual([2, 1, 2, 5, 4]);
  });

  it("picks the best place for the photo, and the fewest ms in a tie", () => {
    const mine = [hit(231), hit(238), hit(225)];
    const lanes = [[hit(218), hit(256)], [hit(244), hit(252)], [hit(220), hit(230)]];
    expect(bestStart(mine, lanes, MAX)).toBe(1);
    expect(bestStart([hit(240), hit(239)], [[hit(300)], [hit(300)]], MAX)).toBe(1);
    expect(bestStart([], [], MAX)).toBeNull();
  });
});

describe("what a start says", () => {
  const field = (me: Runner["reactionMs"] | "jumped", others: [string, number][]): Runner[] => [
    ...others.map(([name, ms]) => ({ name, reactionMs: ms, falseStart: false, me: false })),
    me === "jumped" ? { name: "Vos", reactionMs: null, falseStart: true, me: true } : { name: "Vos", reactionMs: me, falseStart: false, me: true },
  ];

  it("tells the place, who was right ahead and who you beat", () => {
    const summary = startSummary(field(231, [["Tincho", 256], ["Juli", 218], ["Caro", 247], ["Sofi", 289]]), MAX, "el");
    expect(summary).toMatchObject({ place: 2, title: "Llegaste 2º", detail: "A 13 ms de Juli · le ganaste a Tincho, Caro y Sofi", ahead: "Juli" });
    expect(startSummary(field(210, [["Juli", 218], ["Caro", 247]]), MAX, "la")).toMatchObject({ title: "Llegaste 1ª", detail: "Por 8 ms · le ganaste a Juli y Caro" });
    expect(startSummary(field(247, [["Juli", 218], ["Caro", 247]]), MAX, "el")).toMatchObject({ place: 2, detail: "Empataste con Caro", tied: ["Caro"] });
    expect(startSummary(field("jumped", [["Juli", 218]]), MAX, "el")).toMatchObject({ title: "Te adelantaste", detail: "Esta largada no cuenta: vale 450 ms" });
    expect(startSummary(field(240, []), MAX, "la")).toMatchObject({ title: "240 ms", detail: "Hoy sos la primera en largar" });
  });

  it("writes names and places in Spanish", () => {
    expect(namesList(["Tincho"])).toBe("Tincho");
    expect(namesList(["Tincho", "Caro", "Sofi"])).toBe("Tincho, Caro y Sofi");
    expect(ordinal(2)).toBe("2º");
    expect(ordinal(1, "la")).toBe("1ª");
    expect(deName("Juli")).toBe("de Juli");
    expect(deName("El mejor de Chivilcoy")).toBe("del mejor de Chivilcoy");
    expect(deName("La mejor de Argentina")).toBe("de la mejor de Argentina");
    expect(aName("El mejor de Chivilcoy")).toBe("al mejor de Chivilcoy");
    expect(aName("Tincho")).toBe("a Tincho");
  });
});

describe("the finish photo", () => {
  const runner = (name: string, reactionMs: number | null, falseStart = false, me = false): Runner => ({ name, reactionMs, falseStart, me });

  it("replays jumped and missed starts", () => {
    expect(startsOf({ rounds: [{ outcome: "hit", reactionMs: 231 }, { outcome: "impossible", reactionMs: 60 }, { outcome: "miss", reactionMs: null }] })).toEqual([
      { reactionMs: 231, falseStart: false },
      { reactionMs: null, falseStart: true },
      { reactionMs: null, falseStart: false },
    ]);
    expect(startsOf({})).toEqual([]);
  });

  it("says by how much you won or lost", () => {
    expect(photoCaption([runner("Juli", 237), runner("Caro", null, true), runner("Vos", 231, false, true)], MAX, "el")).toBe("Vos 1º por 6 ms");
    expect(photoCaption([runner("Juli", 218), runner("Tincho", 256), runner("Vos", 231, false, true)], MAX, "la")).toBe("Vos 2ª · a 13 ms de Juli");
    expect(photoCaption([runner("Juli", 231), runner("Vos", 231, false, true)], MAX, "el")).toBe("Vos 1º · empate");
    expect(photoCaption([runner("Juli", null, true), runner("Vos", 240, false, true)], MAX, "el")).toBe("Vos 1º");
    expect(photoCaption([runner("Juli", null), runner("Vos", 240, false, true)], MAX, "el")).toBe("Vos 1º por 1260 ms");
    expect(photoCaption([runner("Vos", 240, false, true)], MAX, "el")).toBe("Vos · 240 ms");
    expect(photoCaption([runner("El mejor de Argentina", 256), runner("Vos", 259, false, true)], MAX, "la")).toBe("Vos 2ª · a 3 ms del mejor de Argentina");
    expect(photoCaption([runner("Juli", 231), runner("Vos", null, true, true)], MAX, "el")).toBe("Vos · te adelantaste");
  });
});
