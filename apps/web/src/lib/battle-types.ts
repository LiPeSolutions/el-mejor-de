import type { BattleGame, LargadaOutcome } from "@repo/games";
import type { Article, Avatar, GroupColor, GroupEmblem } from "@repo/shared";

/*
 * What the battles API answers (apps/web/src/server/battles.ts). Times are
 * epoch milliseconds of the server's clock: each answer brings `serverNow`,
 * so the phone can tell how far off its own clock is.
 */

export interface BattlePlayerView {
  userId: string;
  username: string;
  avatar: Avatar;
  article: Article;
  host: boolean;
  me: boolean;
  /** Their phone asked lately. */
  online: boolean;
  /** Still in the room (someone who left still shows in the match they played). */
  inRoom: boolean;
  /** In the match being played: whoever came later plays the next one. */
  playing: boolean;
}

export interface BattleGroupInfo {
  id: string;
  name: string;
  emblem: GroupEmblem;
  color: GroupColor;
}

export interface StandingView {
  userId: string;
  /** A tie shares the place. */
  place: number;
  score: number;
  /** Cinco Preguntas: right answers. */
  correct?: number;
  /** Largada: the average with the penalties, and the best start. */
  averageMs?: number | null;
  bestMs?: number | null;
  /** Diez Letras: words found. */
  words?: number;
  /** Secuencia: still in (or the last one standing). */
  alive?: boolean;
  /** Tubitos: boards solved, and their time added up. */
  solved?: number;
  timeMs?: number;
}

/* ───────────── Cinco Preguntas ───────────── */

export interface TriviaRoundView {
  index: number;
  opensAt: number;
  /** When it closed; while open, the latest it can. */
  closesAt: number;
  closed: boolean;
  /** When the next question (or the podium) comes. */
  nextAt: number | null;
}

/** A question as one player sees it, with the options in their own order. */
export interface TriviaQuestionView {
  index: number;
  prompt: string;
  category: string;
  options: string[];
  opensAt: number;
  /** The clock shown runs out here. */
  answerUntil: number;
}

export interface TriviaRevealView {
  index: number;
  prompt: string;
  /** The right option, in my order, and its text. */
  correctChoice: number;
  correctText: string;
  /** What I chose, in my order. */
  myChoice: number | null;
  results: { userId: string; answered: boolean; correct: boolean; points: number; seconds: number | null }[];
  /** The table after this question. */
  table: StandingView[];
}

export interface TriviaMatchView {
  game: "five-questions";
  id: string;
  startsAt: number;
  endsAt: number | null;
  players: string[];
  questionCount: number;
  answerMs: number;
  /** The question now (open or showing its answer); null during the countdown. */
  round: TriviaRoundView | null;
  /** Who already answered the open question (never what). */
  answered: string[];
  /** My answer to it, in my order. */
  myChoice: number | null;
  /** Every closed question, with its answer. */
  reveals: TriviaRevealView[];
  standings: StandingView[];
}

/* ───────────── Largada ───────────── */

export interface LargadaStartView {
  userId: string;
  outcome: LargadaOutcome;
  reactionMs: number | null;
}

export interface LargadaRoundView {
  index: number;
  lightsAt: number;
  /** The lights go out at this moment on every phone. */
  signalAt: number;
  closedAt: number | null;
  /** The cars race on every phone. */
  raceAt: number | null;
  nextAt: number | null;
  /** The starts that arrived (all of them once it closed, the missing ones as "miss"). */
  starts: LargadaStartView[];
}

export interface LargadaMatchView {
  game: "reflexes";
  id: string;
  startsAt: number;
  endsAt: number | null;
  players: string[];
  startCount: number;
  lights: number;
  lightMs: number;
  firstLightMs: number;
  maxReactionMs: number;
  /** Up to the current start. */
  rounds: LargadaRoundView[];
  standings: StandingView[];
}

/* ───────────── Diez Letras ───────────── */

export interface LettersRoundView {
  index: number;
  opensAt: number;
  /** When it closed; while open, the latest it can (the time and a little grace). */
  closesAt: number;
  closed: boolean;
  /** When the podium comes. */
  nextAt: number | null;
}

/** A word on the podium. `word` is null for a rude one someone else found: it shows hidden. */
export interface LettersFoundWord {
  word: string | null;
  points: number;
  /** Nobody else found it. */
  onlyOne: boolean;
}

export interface LettersMatchView {
  game: "seven-letters";
  id: string;
  startsAt: number;
  endsAt: number | null;
  players: string[];
  /** The clock everyone sees; the server still takes words a moment after. */
  durationMs: number;
  minWordLength: number;
  /** The same for everyone; null until a moment before it opens. */
  letters: string[] | null;
  /** The only round: null during the countdown. */
  round: LettersRoundView | null;
  /** My valid words, in the order I found them. */
  mine: { word: string; points: number }[];
  /** Everyone's words, longest first, once the time is up. */
  found: { userId: string; words: LettersFoundWord[] }[] | null;
  standings: StandingView[];
}

/** What the server says of a word sent in a battle. */
export interface BattleWordResponse {
  word: string;
  /** "duplicate": this player had already found it, and it counted then. */
  status: "valid" | "invalid" | "too-short" | "duplicate";
  /** What the word is worth (0 if it doesn't count). */
  points: number;
}

/* ───────────── Secuencia ───────────── */

/** How a player did in a round: "late" didn't answer in time, "left" left the battle. */
export interface SequenceResultView {
  userId: string;
  outcome: "right" | "wrong" | "late" | "left";
  /** Colors right before the first mistake. */
  right: number;
}

export interface SequenceRoundView {
  index: number;
  /** A tiebreak plays the same level again. */
  level: number;
  length: number;
  replay: boolean;
  /** Who plays it: whoever is still in. */
  players: string[];
  /** The first color shows `leadMs` after; then one every `showMsPerItem`. */
  showAt: number;
  /** Repeating starts. */
  inputAt: number;
  /** The clock shown runs out here. */
  answerUntil: number;
  closedAt: number | null;
  nextAt: number | null;
  /** Once closed: who's in the next round, and how each one did. */
  passed: string[] | null;
  out: string[] | null;
  results: SequenceResultView[] | null;
}

export interface SequenceMatchView {
  game: "sequence";
  id: string;
  startsAt: number;
  endsAt: number | null;
  players: string[];
  pads: number;
  leadMs: number;
  showMsPerItem: number;
  /** Up to the one being played. */
  rounds: SequenceRoundView[];
  /** The round being played, or the next one a moment before it shows, with its colors. */
  current: (SequenceRoundView & { colors: number[] }) | null;
  /** Who already answered the current round (never how). */
  answered: string[];
  /** How I did in it. */
  mine: { correct: boolean; right: number } | null;
  standings: StandingView[];
}

/* ───────────── Tubitos ───────────── */

/** How a board went for a player, once it closed. */
export interface TubitosResultView {
  userId: string;
  solved: boolean;
  moves: number | null;
  timeMs: number | null;
  points: number;
}

export interface TubitosRoundView {
  index: number;
  opensAt: number;
  /** The clock shown runs out here. */
  answerUntil: number;
  /** When it closed; while open, the latest it can. */
  closesAt: number;
  closed: boolean;
  /** When the next board (or the podium) comes. */
  nextAt: number | null;
  /** The fewest pours that solve it. */
  par: number;
  /** Who already solved it (never how, until it closes). */
  solved: string[];
  results: TubitosResultView[] | null;
}

/** The board being played (or the next one, a moment before it opens), in my own version. */
export interface TubitosBoardView {
  index: number;
  tubes: number[][];
  par: number;
  parExact: boolean;
  opensAt: number;
  answerUntil: number;
}

export interface TubitosMatchView {
  game: "water-sort";
  id: string;
  startsAt: number;
  endsAt: number | null;
  players: string[];
  capacity: number;
  undos: number;
  boardCount: number;
  /** Up to the one being played. */
  rounds: TubitosRoundView[];
  current: TubitosBoardView | null;
  /** How the current board went for me, once I solved it. */
  mine: { moves: number; timeMs: number; points: number } | null;
  standings: StandingView[];
}

/** What the server says of a solved board. */
export interface TubitosSolveResponse {
  ok: true;
  moves: number;
  timeMs: number;
  points: number;
}

export type MatchView = TriviaMatchView | LargadaMatchView | LettersMatchView | SequenceMatchView | TubitosMatchView;

/* ───────────── The room ───────────── */

export type BattleStage = "lobby" | "match" | "podium" | "closed";

export interface BattleView {
  id: string;
  code: string;
  group: BattleGroupInfo | null;
  /** The game of the next match. */
  game: BattleGame;
  maxPlayers: number;
  minPlayers: number;
  /** Who's in the room, and whoever left during the match on screen. */
  players: BattlePlayerView[];
  hostId: string;
  meId: string;
  stage: BattleStage;
  /** The match running, or the last one (its podium). */
  match: MatchView | null;
  /** A group's battle on the podium: battles won in the group, this one included. */
  wins: { userId: string; wins: number }[] | null;
  /** When the server got the request and when it answered, for the phone to sync its clock. */
  serverAt: number;
  serverNow: number;
}

export interface BattleCreatedResponse {
  battleId: string;
  /** The group already had one open: this is it. */
  existing: boolean;
}

/** What the page of a battle's link shows, with or without an account. */
export interface BattlePreview {
  battleId: string;
  code: string;
  game: BattleGame;
  host: { username: string; avatar: Avatar };
  players: { userId: string; username: string; avatar: Avatar }[];
  maxPlayers: number;
  playing: boolean;
  /** "in": the signed-in player is already in it. */
  status: "open" | "full" | "in" | "removed";
}

/** A group's live battle, for the card at the top of the group. */
export interface LiveBattleView {
  battleId: string;
  hostName: string;
  game: BattleGame;
  players: { userId: string; username: string; avatar: Avatar }[];
  playing: boolean;
  /** The one looking is in it. */
  in: boolean;
}

export interface GroupBattlesResponse {
  live: LiveBattleView | null;
  /** Battles won by each member, most first; members with none at the end. */
  wins: { userId: string; username: string; avatar: Avatar; wins: number; isMe: boolean }[];
  recent: { id: string; game: BattleGame; endedAt: number; players: number; winners: { userId: string; username: string }[] }[];
}
