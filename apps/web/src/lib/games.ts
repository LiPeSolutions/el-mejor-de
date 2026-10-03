import { usesLargada, type GameId } from "@repo/games";
import { Brain, CircleHelp, Clock, Flag, Grid2x2, Trophy, Type, Zap, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { PersonajeProps } from "@/components/personaje/Personaje";

export type GameSlug = "letras" | "preguntas" | "reflejos" | "secuencia";

interface Fact {
  Icon: LucideIcon;
  value: string;
  label: string;
}

export interface GameTheme {
  id: GameId;
  slug: GameSlug;
  name: string;
  /** Two-line title for tiles: ["Siete", "Letras"]. */
  lines: readonly string[];
  kicker: string;
  howTo: string;
  facts: readonly [Fact, Fact];
  startNote: string;
  /** "75 segundos", shown under "Siguiente reto". */
  duration: string;
  /** Short duration for the home tiles: "90 s". */
  shortDuration: string;
  praise: string;
  Icon: LucideIcon;
  /** Tailwind class with the hero gradient. */
  heroClass: string;
  colors: { main: string; dark: string; light: string; on: string; title: string };
  shadow: string;
  gradient: string;
  mascot: PersonajeProps;
  resultFace: NonNullable<PersonajeProps["face"]>;
}

export const GAMES: Record<GameId, GameTheme> = {
  "seven-letters": {
    id: "seven-letters",
    slug: "letras",
    // "Siete Letras" until 3/10/2026; the id stays "seven-letters".
    name: "Diez Letras",
    lines: ["Diez", "Letras"],
    kicker: "Palabras",
    howTo: "Con 10 letras, armá todas las palabras que puedas. Las largas valen más y la que usa las 10 tiene premio.",
    facts: [
      { Icon: Clock, value: "90 s", label: "de juego" },
      { Icon: Trophy, value: "1.000", label: "puntos máximo" },
    ],
    startNote: "El tiempo arranca cuando tocás",
    duration: "90 segundos",
    shortDuration: "90\u00A0s",
    praise: "¡Bien ahí!",
    Icon: Type,
    heroClass: "bg-hero-letras",
    colors: { main: "#FF6B4A", dark: "#C94F2E", light: "#FFD1C4", on: "#FFFFFF", title: "#C94F2E" },
    shadow: "rgba(255,107,74,.35)",
    gradient: "linear-gradient(90deg,#FF8A6E,#FF6B4A)",
    mascot: { sp: "nioqui", c: { main: "#FF6B4A", light: "#FFD1C4", dark: "#C94F2E" }, prop: "letra" },
    resultFace: "joy",
  },
  "five-questions": {
    id: "five-questions",
    slug: "preguntas",
    name: "Cinco Preguntas",
    lines: ["Cinco", "Preguntas"],
    kicker: "Trivia",
    howTo: "5 preguntas de 15 segundos cada una, con 4 opciones. Responder rápido suma más.",
    facts: [
      { Icon: Clock, value: "75 s", label: "5 × 15 segundos" },
      { Icon: Trophy, value: "1.000", label: "puntos máximo" },
    ],
    startNote: "El tiempo arranca cuando tocás",
    duration: "75 segundos",
    shortDuration: "75\u00A0s",
    praise: "¡Qué cabeza!",
    Icon: CircleHelp,
    heroClass: "bg-hero-preguntas",
    colors: { main: "#8B6CFF", dark: "#6A4FD6", light: "#E4DBFF", on: "#FFFFFF", title: "#6A4FD6" },
    shadow: "rgba(139,108,255,.35)",
    gradient: "linear-gradient(90deg,#A48CFF,#8B6CFF)",
    mascot: { sp: "pelusa", c: { main: "#8B6CFF", light: "#E4DBFF", dark: "#6A4FD6" }, prop: "pregunta", face: "wow" },
    resultFace: "joy",
  },
  reflexes: {
    id: "reflexes",
    slug: "reflejos",
    name: "Largada",
    lines: ["Largada"],
    kicker: "Reflejos",
    howTo: "Cuando se apaguen las cinco luces, tocá. Hoy corrés contra los tiempos que hizo tu grupo.",
    facts: [
      { Icon: Flag, value: "3 largadas", label: "medio minuto, más o menos" },
      { Icon: Trophy, value: "1.000", label: "con 200 ms" },
    ],
    startNote: "Las luces arrancan cuando tocás",
    duration: "medio minuto",
    shortDuration: "40\u00A0s",
    praise: "¡Qué reflejos!",
    Icon: Flag,
    heroClass: "bg-hero-reflejos",
    colors: { main: "#2EC4B6", dark: "#158A7F", light: "#CFF3EE", on: "#FFFFFF", title: "#158A7F" },
    shadow: "rgba(46,196,182,.35)",
    gradient: "linear-gradient(90deg,#4FD6C9,#2EC4B6)",
    mascot: { sp: "rana", c: { main: "#2EC4B6", light: "#CFF3EE", dark: "#158A7F" }, prop: "bandera", face: "joy" },
    resultFace: "joy",
  },
  sequence: {
    id: "sequence",
    slug: "secuencia",
    name: "Secuencia",
    lines: ["Secuencia"],
    kicker: "Memoria",
    howTo: "Mirá la secuencia de botones y repetila. Cada nivel suma un paso más. Seguís hasta que te equivocás.",
    facts: [
      { Icon: Brain, value: "Sin reloj", label: "un minuto, más o menos" },
      { Icon: Trophy, value: "1.000", label: "en el nivel 12" },
    ],
    startNote: "La primera secuencia arranca cuando tocás",
    duration: "un minuto",
    shortDuration: "60\u00A0s",
    praise: "¡Qué memoria!",
    Icon: Grid2x2,
    heroClass: "bg-hero-secuencia",
    colors: { main: "#FFC53D", dark: "#D9971A", light: "#FFF0C2", on: "#23263A", title: "#9A6200" },
    shadow: "rgba(255,197,61,.4)",
    gradient: "linear-gradient(90deg,#FFD978,#FFC53D)",
    mascot: { sp: "llama", c: { main: "#FFC53D", light: "#FFF0C2", dark: "#D9971A" }, face: "wow" },
    resultFace: "joy",
  },
};

export const GAME_LIST = Object.values(GAMES);

/** The reflexes game before it became Largada, for the days that still had it (see `usesLargada`). */
export const COLOR_REFLEXES: GameTheme = {
  ...GAMES.reflexes,
  name: "Reflejos",
  lines: ["Reflejos"],
  kicker: "Habilidad",
  howTo: "Tocá apenas la pantalla cambia. Son 5 rondas y cuenta tu promedio. Si tocás antes de tiempo, perdés la ronda.",
  facts: [
    { Icon: Zap, value: "5 rondas", label: "un minuto, más o menos" },
    { Icon: Trophy, value: "1.000", label: "puntos máximo" },
  ],
  startNote: "El tiempo arranca cuando tocás",
  duration: "un minuto",
  shortDuration: "60\u00A0s",
  Icon: Zap,
  mascot: { sp: "rana", c: { main: "#2EC4B6", light: "#CFF3EE", dark: "#158A7F" }, prop: "rayo", face: "joy" },
};

/** How a game looked on a day's challenge: before Largada, reflexes was the color-change game. */
export function themeOn(id: GameId, date: string): GameTheme {
  return id === "reflexes" && !usesLargada("daily", date) ? COLOR_REFLEXES : GAMES[id];
}

export function gameBySlug(slug: string): GameTheme | undefined {
  return GAME_LIST.find((game) => game.slug === slug);
}

/** CSS variables that game-colored components read (bg-(--game), shadow-(--game-shadow)…). */
export function gameStyle(game: GameTheme): CSSProperties {
  return {
    "--game": game.colors.main,
    "--game-dark": game.colors.dark,
    "--game-light": game.colors.light,
    "--game-on": game.colors.on,
    "--game-title": game.colors.title,
    "--game-shadow": `0 16px 32px ${game.shadow}`,
    "--game-tile-shadow": `0 10px 22px ${game.shadow.replace(/[\d.]+\)$/, ".3)")}`,
    "--game-gradient": game.gradient,
  } as CSSProperties;
}
