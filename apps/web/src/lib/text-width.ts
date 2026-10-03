/*
 * How wide a text is with the app's fonts, to size the pills drawn inside
 * an SVG (Largada's track). Measured with a canvas; before the fonts load it
 * uses the fallback font, close enough.
 */

let context: CanvasRenderingContext2D | null | undefined;

export function textWidth(text: string, size: number, weight = 800, font: "body" | "display" = "body"): number {
  const estimate = text.length * size * 0.58;
  if (typeof document === "undefined") return estimate;
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return estimate;
  const family = getComputedStyle(document.documentElement).getPropertyValue(font === "display" ? "--font-outfit" : "--font-jakarta").trim() || "sans-serif";
  context.font = `${weight} ${size}px ${family}`;
  return context.measureText(text).width;
}
