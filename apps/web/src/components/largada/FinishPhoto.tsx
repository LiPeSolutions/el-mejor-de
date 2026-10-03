"use client";

import { forwardRef, type ReactNode } from "react";
import { ordinal } from "@/lib/largada";
import type { LargadaStart } from "@/lib/largada-types";
import { textWidth } from "@/lib/text-width";
import { CAR, CarShape } from "./Car";
import type { Racer } from "./field";

/*
 * The finish photo (design 06): the last frame of the player's best start,
 * the cars crossing the line and how far behind the winner each one was.
 * One self-contained SVG, so it can also go out as a PNG when sharing.
 */

const W = 318;
const K = 0.6;
const ASPHALT_TOP = 102 * K;
const LANE = 44;
const SCALE = 0.44;
const FINISH = 210;
/** How far behind the winner's nose a car can be and still fit whole. */
const MAX_BACK = 91;
/** A few milliseconds read as about 3 px each; big gaps squeeze so every car stays in the picture. */
const backFor = (behindMs: number) => MAX_BACK * (1 - Math.exp(-behindMs / 28));
const CROWD = ["#FFC53D", "#FF7AA2", "#4F6BFF", "#FF6B4A", "#8B6CFF", "#2EC4B6"];
/** On the page the app's font (the class); in the shared picture, which can't load it, the system's. */
const FONT = "system-ui, sans-serif";

export const photoHeight = (lanes: number) => ASPHALT_TOP + 3.5 + lanes * LANE + Math.max(0, lanes - 1) * 2 + 2 + 1.5 + 10;

function Pill({ x, y, text, tone }: { x: number; y: number; text: string; tone: "gold" | "white" | "danger" }) {
  const size = 17;
  const h = 32;
  const width = textWidth(text, size, 800) + 22;
  const colors = { gold: ["#FFC53D", "#23263A"], white: ["rgba(255,255,255,.92)", "#4B5070"], danger: ["#E2504C", "#FFFFFF"] }[tone];
  // A long one ("No largó") moves left to stay inside the picture.
  const left = Math.min(x, W - width - 4);
  return (
    <g transform={`translate(${left},${y})`}>
      <rect width={width} height={h} rx={h / 2} fill={colors[0]} />
      <text x="11" y={h / 2} dy="0.36em" fontSize={size} fontWeight="800" fill={colors[1]} fontFamily={FONT} className="font-sans tabular-nums">
        {text}
      </text>
    </g>
  );
}

interface Props {
  /** Top to bottom, the player last, each with their start of that race. */
  field: { racer: Racer; start: LargadaStart }[];
  maxReactionMs: number;
}

export const FinishPhoto = forwardRef<SVGSVGElement, Props>(function FinishPhoto({ field, maxReactionMs }, ref) {
  const time = (start: LargadaStart) => (start.falseStart ? Number.POSITIVE_INFINITY : (start.reactionMs ?? maxReactionMs));
  const best = Math.min(...field.map(({ start }) => time(start)));
  const height = photoHeight(field.length);
  const carW = CAR.width * SCALE;
  const carH = CAR.height * SCALE;
  const dots: ReactNode[] = [];
  [
    { y: 12.5, x0: 16, ci: 5 },
    { y: 36, x0: 32, ci: 0 },
    { y: 54, x0: 16, ci: 5 },
  ].forEach((row, r) => {
    let i = 0;
    for (let x = row.x0 * K; x < W + 33 * K; x += 33 * K, i++) dots.push(<circle key={`${r}-${i}`} cx={x} cy={row.y * K} r={4.5 * K} fill={CROWD[(row.ci + i) % 6]} />);
  });
  const lanes = field.map(({ racer, start }, i) => {
    const top = ASPHALT_TOP + 3.5 + i * (LANE + 2);
    const jumped = start.falseStart;
    const behind = jumped ? 0 : time(start) - best;
    const missed = !jumped && start.reactionMs === null;
    const nose = jumped ? -70 + carW : 226 - backFor(behind);
    // The winner's name, when it fits right of the finish; the car tells who it is otherwise.
    const first = `${ordinal(1, racer.article)} ${racer.name}`;
    const label = jumped ? "Se adelantó" : missed ? "No largó" : behind === 0 ? (textWidth(first, 17, 800) + 22 <= W - 236 ? first : ordinal(1, racer.article)) : `+${behind} ms`;
    return (
      <g key={racer.key}>
        {racer.me && <rect x="0" y={top} width={W} height={LANE} fill="rgba(79,107,255,.22)" />}
        <g transform={`translate(${nose - carW},${top + LANE - 2 - carH}) scale(${SCALE})`} opacity={racer.ghost ? 0.62 : 1}>
          <CarShape colors={racer.colors} avatar={racer.avatar} number={racer.number} />
        </g>
        <Pill x={jumped ? 76 : 232} y={top + 5} text={label} tone={jumped || missed ? "danger" : behind === 0 ? "gold" : "white"} />
      </g>
    );
  });
  const asphaltBottom = ASPHALT_TOP + 3.5 + field.length * LANE + Math.max(0, field.length - 1) * 2 + 2 + 1.5;
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Foto de llegada">
      <defs>
        <pattern id="photo-checker" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#FFFFFF" />
          <rect width="7" height="7" fill="#23263A" />
          <rect x="7" y="7" width="7" height="7" fill="#23263A" />
        </pattern>
      </defs>
      <rect x="0" y={10 * K} width={W} height={60 * K} fill="#E8EAF6" />
      {[24, 42, 60].map((y) => (
        <rect key={y} x="0" y={y * K} width={W} height={5 * K} fill="#D9DDF3" />
      ))}
      {dots}
      <rect x="0" y="0" width={W} height={10 * K} fill="#23263A" />
      <rect x="0" y={70 * K} width={W} height={12 * K} fill="#B8BDD6" />
      <rect x="0" y={74 * K} width={W} height={3 * K} fill="#FFFFFF" />
      <rect x="0" y={82 * K} width={W} height={12 * K} fill="#6CCB6C" />
      <rect x="0" y={94 * K} width={W} height="8" fill="#FFFFFF" />
      {Array.from({ length: Math.ceil(W / 32) }, (_, i) => (
        <rect key={i} x={i * 32} y={94 * K} width="16" height="8" fill="#E2504C" />
      ))}
      <rect x="0" y={ASPHALT_TOP} width={W} height={asphaltBottom - ASPHALT_TOP} fill="#3B4056" />
      <rect x={FINISH} y={ASPHALT_TOP} width="14" height={asphaltBottom - ASPHALT_TOP} fill="url(#photo-checker)" />
      {lanes}
      <rect x="0" y={asphaltBottom} width={W} height="8" fill="#FFFFFF" />
      {Array.from({ length: Math.ceil(W / 32) + 1 }, (_, i) => (
        <rect key={i} x={i * 32 - 8} y={asphaltBottom} width="16" height="8" fill="#E2504C" />
      ))}
      <rect x="0" y={asphaltBottom + 8} width={W} height={Math.max(0, height - asphaltBottom - 8)} fill="#6CCB6C" />
    </svg>
  );
});

let fontFaces: Promise<string> | null = null;

/** The app's fonts as @font-face rules with the files inside: a picture can't load them on its own. */
function embeddedFonts(): Promise<string> {
  fontFaces ??= (async () => {
    const rules: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(list)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const url = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
        if (!url) continue;
        try {
          const file = await (await fetch(new URL(url, sheet.href ?? window.location.href))).blob();
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          rules.push(`@font-face{font-family:${rule.style.getPropertyValue("font-family")};font-weight:${rule.style.getPropertyValue("font-weight") || "normal"};src:url("${data}")}`);
        } catch {
          // That font stays out: the system's draws those texts.
        }
      }
    }
    return rules.join("");
  })();
  return fontFaces;
}

/** The photo as a picture: its SVG drawn into an image, with the page's fonts. */
async function photoImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Classes don't reach inside a picture: each text takes its font from the page.
  const texts = svg.querySelectorAll("text");
  clone.querySelectorAll("text").forEach((text, i) => {
    const style = getComputedStyle(texts[i]!);
    text.setAttribute("font-family", style.fontFamily);
    text.setAttribute("font-weight", style.fontWeight);
    text.setAttribute("style", `font-variant-numeric:${style.fontVariantNumeric}`);
  });
  const css = await embeddedFonts();
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.prepend(style);
  }
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  await image.decode();
  return image;
}

/** The polaroid as a PNG for the share sheet: the photo on a white card with its caption. */
export async function polaroidPng(svg: SVGSVGElement, label: string, caption: string, scale = 3): Promise<Blob | null> {
  const box = svg.viewBox.baseVal;
  const image = await photoImage(svg);
  await document.fonts?.ready;
  const margin = 16;
  const pad = 10;
  const captionH = 40;
  const cardW = box.width + pad * 2;
  const cardH = pad + box.height + captionH;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((cardW + margin * 2) * scale);
  canvas.height = Math.round((cardH + margin * 2) * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(scale, scale);
  context.fillStyle = "#DAE1F6";
  context.fillRect(0, 0, cardW + margin * 2, cardH + margin * 2);
  context.fillStyle = "#FFFFFF";
  context.beginPath();
  if (typeof context.roundRect === "function") context.roundRect(margin, margin, cardW, cardH, 14);
  else context.rect(margin, margin, cardW, cardH);
  context.fill();
  context.drawImage(image, margin + pad, margin + pad, box.width, box.height);
  const family = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "system-ui, sans-serif";
  const middle = margin + pad + box.height + captionH / 2;
  context.textBaseline = "middle";
  context.font = `800 12px ${family("--font-jakarta")}`;
  context.fillStyle = "#6C7191";
  context.fillText(label.toUpperCase(), margin + pad + 2, middle);
  context.font = `800 16px ${family("--font-outfit")}`;
  context.fillStyle = "#4F6BFF";
  context.textAlign = "right";
  context.fillText(caption, margin + pad + box.width - 2, middle);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
