import "server-only";
import { randomInt } from "node:crypto";
import {
  addUsedQuestions,
  battlePlayers,
  countBattlesCreatedSince,
  countCodeFailures,
  createBattle,
  createMatch,
  endMatch,
  findOpenBattle,
  getBattle,
  getMembership,
  groupBattleWins,
  groupPlayers,
  groupRecentMatches,
  joinBattle,
  latestMatch,
  leaveBattle,
  markShown,
  matchMoves,
  matchWords,
  openGroupBattle,
  playerOpenBattles,
  recordAnswer,
  recordCodeFailure,
  recordStart,
  recordWord,
  resetUsedQuestions,
  setBattleGame,
  setBattleLobby,
  touchBattlePlayer,
  unendedGroupMatches,
  getGroup,
  type Battle,
  type BattleMatch,
  type BattleMove,
  type BattlePlayer,
  type BattleWord,
  type Queryable,
  type User,
} from "@repo/db";
import {
  BATTLE_RULES,
  LARGADA_RULES,
  TEN_LETTERS_RULES,
  battleWinners,
  isBattleGame,
  largadaFlow,
  largadaStandings,
  largadaStart,
  lettersFlow,
  lettersPoints,
  lettersStandings,
  normalizeWord,
  triviaAnswer,
  triviaFlow,
  triviaStandings,
  type BattleGame,
  type BattleStanding,
  type LargadaMove,
  type LargadaRoundFlow,
  type LettersRoundFlow,
  type LettersWord,
  type MatchFlow,
  type RosterEntry,
  type TriviaMove,
  type TriviaRoundFlow,
} from "@repo/games";
import { DEFAULT_AVATAR, INVITE_ALPHABET, inviteKey, isPhraseBlocked, parseAvatar, toGameDate, type GroupColor, type GroupEmblem } from "@repo/shared";
import type {
  BattleCreatedResponse,
  BattleGroupInfo,
  BattlePlayerView,
  BattlePreview,
  BattleStage,
  BattleView,
  BattleWordResponse,
  GroupBattlesResponse,
  LargadaMatchView,
  LettersMatchView,
  LiveBattleView,
  MatchView,
  StandingView,
  TriviaMatchView,
  TriviaQuestionView,
} from "@/lib/battle-types";
import {
  categoryLabel,
  largadaDelays,
  lettersWords,
  pickLetters,
  pickQuestions,
  playerOptions,
  questionById,
  type BattleLargadaContent,
  type BattleLettersContent,
  type BattleTriviaContent,
} from "./battle-content";
import { HttpError } from "./http";

/*
 * Live battles (docs/PLAN.md §8): who can do what in a room, and what each
 * phone sees. Nothing runs between requests: each one works out where the
 * match is from its start and the moves (triviaFlow, largadaFlow and
 * lettersFlow in @repo/games), writes the result once it ended and answers
 * with the server's clock, which the phones sync to. Every choice by game
 * is a switch over BattleGame, so a new game can't be forgotten in one.
 */

export interface BattleContext {
  now: number;
  /** Keyed hash of the connection's IP, or null when unknown. */
  ipHash: string | null;
}

const CODE_LENGTH = 4;
const CODE_PATTERN = /^[2-9A-HJKMNP-Z]{4}$/;
const NEW_BATTLES = { windowMs: 60 * 60_000, max: 20 } as const;
const CODE_FAILURE_LIMITS = { windowMs: 60 * 60_000, perAccount: 10, perConnection: 30 } as const;
/** A phone asks often; its "still here" is written at most this often. */
const SEEN_EVERY_MS = 5_000;
/** A match nobody watched to the end is written down after this. */
const SETTLE_AFTER_MS = 10 * 60_000;
/** A group's room shows as live (and new ones join it) while someone's phone asked this recently. */
const LIVE_MS = 2 * 60_000;

/* ───────────── Helpers ───────────── */

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseBattleId(raw: string): string {
  if (!ID.test(raw)) throw new HttpError(404, "battle-not-found");
  return raw.toLowerCase();
}

/** A battle's code however it's typed ("k7q2", "K7 Q2"), or null. */
export function battleCode(raw: string): string | null {
  const key = inviteKey(raw);
  return CODE_PATTERN.test(key) ? key : null;
}

function newCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]).join("");
}

const avatarOf = (value: unknown) => parseAvatar(value) ?? DEFAULT_AVATAR;

/** For a switch over the games: TypeScript says which one is missing. */
function unknownGame(game: never): never {
  throw new Error(`unknown battle game ${String(game)}`);
}

/** The match's game. The database only takes battle games; this tells TypeScript. */
function gameOf(match: BattleMatch): BattleGame {
  if (!isBattleGame(match.game)) throw new Error(`match ${match.id} has the game ${match.game}`);
  return match.game;
}

/** What the players did in a match: one move per round, or the words of Diez Letras. */
interface Plays {
  moves: readonly BattleMove[];
  words: readonly BattleWord[];
}

async function playsOf(db: Queryable, match: BattleMatch | null): Promise<Plays> {
  if (!match) return { moves: [], words: [] };
  if (match.game === "seven-letters") return { moves: [], words: await matchWords(db, match.id) };
  return { moves: await matchMoves(db, match.id), words: [] };
}

interface Loaded {
  battle: Battle;
  players: BattlePlayer[];
  match: BattleMatch | null;
  plays: Plays;
}

async function load(db: Queryable, battleId: string): Promise<Loaded> {
  const battle = await getBattle(db, battleId);
  if (!battle) throw new HttpError(404, "battle-not-found");
  const players = await battlePlayers(db, battleId);
  const match = await latestMatch(db, battleId);
  return { battle, players, match, plays: await playsOf(db, match) };
}

const present = (players: readonly BattlePlayer[]) => players.filter((player) => player.leftAt === null);

/** Who plays the match, and when each one left it (they don't hold up the rest). */
function rosterOf(match: BattleMatch): RosterEntry[] {
  return match.players.map((userId) => ({ userId, leftAt: match.departures[userId] ?? null }));
}

const triviaMoves = (moves: readonly BattleMove[]): TriviaMove[] =>
  moves.map((move) => ({ userId: move.userId, round: move.round, shownAt: move.shownAt, answeredAt: move.playedAt, choice: move.choice }));

const largadaMoves = (moves: readonly BattleMove[]): LargadaMove[] =>
  moves.flatMap((move) =>
    move.playedAt === null ? [] : [{ userId: move.userId, round: move.round, at: move.playedAt, reactionMs: move.reactionMs, falseStart: move.falseStart ?? false }],
  );

const lettersPlayed = (words: readonly BattleWord[]): LettersWord[] => words.map((one) => ({ userId: one.userId, word: one.word, at: one.playedAt }));

type Flow =
  | { game: "five-questions"; flow: MatchFlow<TriviaRoundFlow> }
  | { game: "reflexes"; flow: MatchFlow<LargadaRoundFlow> }
  | { game: "seven-letters"; flow: MatchFlow<LettersRoundFlow> };

function flowOf(match: BattleMatch, plays: Plays, now: number): Flow {
  const roster = rosterOf(match);
  const game = gameOf(match);
  switch (game) {
    case "five-questions":
      return { game, flow: triviaFlow({ startsAt: match.startsAt, roster, moves: triviaMoves(plays.moves), now }) };
    case "reflexes": {
      const { delaysMs } = match.content as BattleLargadaContent;
      return { game, flow: largadaFlow({ startsAt: match.startsAt, delaysMs, roster, moves: largadaMoves(plays.moves), now }) };
    }
    case "seven-letters":
      return { game, flow: lettersFlow({ startsAt: match.startsAt, roster, now }) };
    default:
      return unknownGame(game);
  }
}

/** The table once every round was played. */
function finalStandings(match: BattleMatch, plays: Plays): BattleStanding[] {
  const roster = rosterOf(match);
  const game = gameOf(match);
  switch (game) {
    case "five-questions":
      return triviaStandings(roster, triviaMoves(plays.moves), BATTLE_RULES.trivia.questions);
    case "reflexes":
      return largadaStandings(roster, largadaMoves(plays.moves), BATTLE_RULES.largada.starts);
    case "seven-letters":
      return lettersStandings(roster, lettersPlayed(plays.words));
    default:
      return unknownGame(game);
  }
}

/** Writes how the match ended (once, whoever asks first) and returns it ended. */
async function settle(db: Queryable, match: BattleMatch, plays: Plays, endedAt: number): Promise<BattleMatch> {
  const results = finalStandings(match, plays);
  const winners = battleWinners(results);
  await endMatch(db, { matchId: match.id, endedAt, results, winners });
  return { ...match, endedAt, results, winners };
}

/** The match as it is now: written down once it ended. */
async function current(db: Queryable, loaded: Loaded, now: number): Promise<{ match: BattleMatch | null; flow: Flow | null }> {
  const { match, plays } = loaded;
  if (!match) return { match: null, flow: null };
  const flow = flowOf(match, plays, now);
  if (match.endedAt === null && flow.flow.endsAt !== null && now >= flow.flow.endsAt) {
    return { match: await settle(db, match, plays, flow.flow.endsAt), flow };
  }
  return { match, flow };
}

function stageOf(battle: Battle, match: BattleMatch | null): BattleStage {
  if (battle.closedAt !== null) return "closed";
  if (!match) return "lobby";
  if (match.endedAt === null) return "match";
  return battle.lobbyAt !== null && battle.lobbyAt > match.startedAt ? "lobby" : "podium";
}

async function groupInfo(db: Queryable, groupId: string | null): Promise<BattleGroupInfo | null> {
  if (!groupId) return null;
  const group = await getGroup(db, groupId);
  return group ? { id: group.id, name: group.name, emblem: group.emblem as GroupEmblem, color: group.color as GroupColor } : null;
}

/** Someone in the room (or who played the match on screen). */
function requirePlayer(loaded: Loaded, user: User): BattlePlayer {
  const me = loaded.players.find((player) => player.userId === user.id);
  if (!me || me.leftAt !== null) throw new HttpError(403, "not-in-battle");
  return me;
}

function requireHost(loaded: Loaded, user: User): void {
  requirePlayer(loaded, user);
  if (loaded.battle.hostId !== user.id) throw new HttpError(403, "not-host");
}

function requireOpen(battle: Battle): void {
  if (battle.closedAt !== null) throw new HttpError(410, "battle-closed");
}

/** A player is in one room at a time: joining one leaves the rest. */
async function leaveOthers(db: Queryable, userId: string, keep: string | null, now: number): Promise<void> {
  for (const id of await playerOpenBattles(db, userId)) {
    if (id !== keep) await leaveBattle(db, id, userId, now);
  }
}

async function enter(db: Queryable, user: User, battle: Battle, now: number): Promise<void> {
  const outcome = await joinBattle(db, { battleId: battle.id, userId: user.id, maxPlayers: BATTLE_RULES.maxPlayers, at: now });
  if (outcome === "closed") throw new HttpError(410, "battle-closed");
  if (outcome === "removed") throw new HttpError(403, "removed");
  if (outcome === "full") throw new HttpError(409, "battle-full");
  await leaveOthers(db, user.id, battle.id, now);
}

/** A room where nobody's phone asked for a while counts as gone. */
const isIdle = (players: readonly BattlePlayer[], now: number) => present(players).every((player) => now - player.seenAt > BATTLE_RULES.idleMs);

/* ───────────── Rooms ───────────── */

/**
 * Opens a room, from a group (its members see it live) or loose. A group
 * has one open room at a time: asking for another one joins it.
 */
export async function openRoom(db: Queryable, user: User, input: { groupId: string | null; game?: string }, ctx: BattleContext): Promise<BattleCreatedResponse> {
  if (input.groupId) {
    const membership = await getMembership(db, input.groupId, user.id);
    if (!membership || membership.leftAt !== null) throw new HttpError(404, "group-not-found");
    const open = await openGroupBattle(db, input.groupId, ctx.now - LIVE_MS);
    if (open) {
      await enter(db, user, open, ctx.now);
      return { battleId: open.id, existing: true };
    }
  }
  if ((await countBattlesCreatedSince(db, user.id, ctx.now - NEW_BATTLES.windowMs)) >= NEW_BATTLES.max) throw new HttpError(429, "too-many-battles");
  const game = input.game && isBattleGame(input.game) ? input.game : "reflexes";
  await leaveOthers(db, user.id, null, ctx.now);
  for (let tries = 0; tries < 8; tries++) {
    const battle = await createBattle(db, { code: newCode(), groupId: input.groupId, userId: user.id, game, at: ctx.now });
    if (battle) return { battleId: battle.id, existing: false };
  }
  throw new Error("no free battle code");
}

/** Joins a group's room from the card in the group. */
export async function joinFromGroup(db: Queryable, user: User, battleId: string, ctx: BattleContext): Promise<{ battleId: string }> {
  const battle = await getBattle(db, battleId);
  if (!battle || !battle.groupId) throw new HttpError(404, "battle-not-found");
  requireOpen(battle);
  const membership = await getMembership(db, battle.groupId, user.id);
  if (!membership || membership.leftAt !== null) throw new HttpError(404, "battle-not-found");
  await enter(db, user, battle, ctx.now);
  return { battleId: battle.id };
}

async function openRoomByCode(db: Queryable, user: User | null, raw: string, ctx: BattleContext): Promise<{ battle: Battle; players: BattlePlayer[] }> {
  const since = ctx.now - CODE_FAILURE_LIMITS.windowMs;
  const [byAccount, byConnection] = await Promise.all([
    user ? countCodeFailures(db, { userId: user.id }, since) : 0,
    ctx.ipHash ? countCodeFailures(db, { ipHash: ctx.ipHash }, since) : 0,
  ]);
  if (byAccount >= CODE_FAILURE_LIMITS.perAccount || byConnection >= CODE_FAILURE_LIMITS.perConnection) throw new HttpError(429, "too-many-codes");
  const code = battleCode(raw);
  const battle = code ? await findOpenBattle(db, code) : null;
  const players = battle ? await battlePlayers(db, battle.id) : [];
  if (!battle || isIdle(players, ctx.now)) {
    await recordCodeFailure(db, { userId: user?.id ?? null, ipHash: ctx.ipHash, at: ctx.now });
    throw new HttpError(404, "battle-not-found");
  }
  return { battle, players };
}

/** What the page of the link shows: who invites, to what and who's in. Works without an account. */
export async function previewRoom(db: Queryable, user: User | null, raw: string, ctx: BattleContext): Promise<BattlePreview> {
  const { battle, players } = await openRoomByCode(db, user, raw, ctx);
  const inRoom = present(players);
  const host = players.find((player) => player.userId === battle.hostId) ?? inRoom[0]!;
  const mine = user ? players.find((player) => player.userId === user.id) : undefined;
  const match = await latestMatch(db, battle.id);
  const status: BattlePreview["status"] = mine?.removedAt
    ? "removed"
    : mine && mine.leftAt === null
      ? "in"
      : inRoom.length >= BATTLE_RULES.maxPlayers
        ? "full"
        : "open";
  return {
    battleId: battle.id,
    code: battle.code,
    game: isBattleGame(battle.game) ? battle.game : "reflexes",
    host: { username: host.username, avatar: avatarOf(host.avatar) },
    players: inRoom.map((player) => ({ userId: player.userId, username: player.username, avatar: avatarOf(player.avatar) })),
    maxPlayers: BATTLE_RULES.maxPlayers,
    playing: match !== null && match.endedAt === null,
    status,
  };
}

export async function joinWithCode(db: Queryable, user: User, raw: string, ctx: BattleContext): Promise<{ battleId: string }> {
  const { battle } = await openRoomByCode(db, user, raw, ctx);
  await enter(db, user, battle, ctx.now);
  return { battleId: battle.id };
}

export async function leaveRoom(db: Queryable, user: User, battleId: string, ctx: BattleContext): Promise<{ ok: true }> {
  await leaveBattle(db, battleId, user.id, ctx.now);
  return { ok: true };
}

/** The host takes someone out of the room: they can't come back to it. */
export async function removeFromRoom(db: Queryable, user: User, battleId: string, userId: string, ctx: BattleContext): Promise<{ ok: true }> {
  const loaded = await load(db, battleId);
  requireHost(loaded, user);
  if (userId === user.id) throw new HttpError(400, "cant-remove-yourself");
  if (!present(loaded.players).some((player) => player.userId === userId)) throw new HttpError(404, "not-in-battle");
  await leaveBattle(db, battleId, userId, ctx.now, true);
  return { ok: true };
}

export async function chooseGame(db: Queryable, user: User, battleId: string, game: string, ctx: BattleContext): Promise<{ ok: true }> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requireHost(loaded, user);
  if (!isBattleGame(game)) throw new HttpError(400, "game-not-available");
  const { match } = await current(db, loaded, ctx.now);
  if (stageOf(loaded.battle, match) === "match") throw new HttpError(409, "match-running");
  await setBattleGame(db, battleId, game);
  if (stageOf(loaded.battle, match) === "podium") await setBattleLobby(db, battleId, ctx.now);
  return { ok: true };
}

/** "Otro juego": from the podium back to the room, to choose. */
export async function backToLobby(db: Queryable, user: User, battleId: string, ctx: BattleContext): Promise<{ ok: true }> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requireHost(loaded, user);
  const { match } = await current(db, loaded, ctx.now);
  if (stageOf(loaded.battle, match) === "match") throw new HttpError(409, "match-running");
  await setBattleLobby(db, battleId, ctx.now);
  return { ok: true };
}

/** "Empezar" or "Revancha": a new match for everyone in the room, after the countdown. */
export async function startMatch(db: Queryable, user: User, battleId: string, ctx: BattleContext): Promise<{ ok: true }> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requireHost(loaded, user);
  const { match } = await current(db, loaded, ctx.now);
  if (stageOf(loaded.battle, match) === "match") throw new HttpError(409, "match-running");
  const players = present(loaded.players);
  if (players.length < BATTLE_RULES.minPlayers) throw new HttpError(409, "not-enough-players");
  const game = loaded.battle.game;
  if (!isBattleGame(game)) throw new HttpError(409, "game-not-available");

  let content: BattleTriviaContent | BattleLargadaContent | BattleLettersContent;
  switch (game) {
    case "five-questions": {
      const picked = pickQuestions(toGameDate(new Date(ctx.now)), loaded.battle.usedQuestions);
      if (picked.reset) await resetUsedQuestions(db, battleId);
      await addUsedQuestions(db, battleId, picked.ids);
      content = { questionIds: picked.ids };
      break;
    }
    case "reflexes":
      content = { delaysMs: largadaDelays() };
      break;
    case "seven-letters":
      content = pickLetters(toGameDate(new Date(ctx.now)));
      break;
    default:
      return unknownGame(game);
  }
  const created = await createMatch(db, {
    battleId,
    groupId: loaded.battle.groupId,
    game,
    players: players.map((player) => player.userId),
    content,
    startedAt: ctx.now,
    startsAt: ctx.now + BATTLE_RULES.countdownMs,
  });
  if (!created) throw new HttpError(409, "match-running");
  return { ok: true };
}

/* ───────────── What each phone sees ───────────── */

function standingViews(rows: readonly BattleStanding[]): StandingView[] {
  return rows.map((row) => ({
    userId: row.userId,
    place: row.place,
    score: row.score,
    correct: row.correct,
    averageMs: row.averageMs,
    bestMs: row.bestMs,
    words: row.words,
  }));
}

function triviaView(match: BattleMatch, moves: readonly BattleMove[], flow: MatchFlow<TriviaRoundFlow>, userId: string): TriviaMatchView {
  const { questionIds } = match.content as BattleTriviaContent;
  const roster = rosterOf(match);
  const answers = triviaMoves(moves);
  const round = flow.rounds.at(-1) ?? null;
  const open = round && !round.closed ? round : null;
  const mine = open ? answers.find((move) => move.round === open.index && move.userId === userId) : undefined;
  const orderOf = (index: number) => playerOptions(match.id, userId, index, questionById(questionIds[index]!)).order;
  const closed = flow.rounds.filter((one) => one.closed);
  return {
    game: "five-questions",
    id: match.id,
    startsAt: match.startsAt,
    endsAt: flow.endsAt,
    players: match.players,
    questionCount: BATTLE_RULES.trivia.questions,
    answerMs: BATTLE_RULES.trivia.answerMs,
    round,
    answered: open ? answers.filter((move) => move.round === open.index && move.answeredAt !== null && move.answeredAt <= open.closesAt).map((move) => move.userId) : [],
    myChoice: open && mine?.choice != null && mine.answeredAt !== null ? orderOf(open.index).indexOf(mine.choice) : null,
    reveals: closed.map((one) => {
      const question = questionById(questionIds[one.index]!);
      const order = orderOf(one.index);
      const myMove = answers.find((move) => move.round === one.index && move.userId === userId);
      return {
        index: one.index,
        prompt: question.prompt,
        correctChoice: order.indexOf(0),
        correctText: question.options[0],
        myChoice: myMove?.choice != null && myMove.answeredAt !== null ? order.indexOf(myMove.choice) : null,
        results: roster.map(({ userId: id }) => {
          const answer = triviaAnswer(answers.find((move) => move.round === one.index && move.userId === id));
          return { userId: id, answered: answer.answered, correct: answer.correct, points: answer.points, seconds: answer.seconds };
        }),
        table: standingViews(triviaStandings(roster, answers, one.index + 1)),
      };
    }),
    standings: standingViews(triviaStandings(roster, answers, closed.length)),
  };
}

function largadaView(match: BattleMatch, moves: readonly BattleMove[], flow: MatchFlow<LargadaRoundFlow>): LargadaMatchView {
  const roster = rosterOf(match);
  const starts = largadaMoves(moves);
  const closed = flow.rounds.filter((round) => round.closedAt !== null).length;
  return {
    game: "reflexes",
    id: match.id,
    startsAt: match.startsAt,
    endsAt: flow.endsAt,
    players: match.players,
    startCount: BATTLE_RULES.largada.starts,
    lights: LARGADA_RULES.lights,
    lightMs: LARGADA_RULES.lightMs,
    firstLightMs: BATTLE_RULES.largada.firstLightMs,
    maxReactionMs: LARGADA_RULES.maxReactionMs,
    rounds: flow.rounds.map((round) => {
      const sent = starts.filter((move) => move.round === round.index && move.at <= round.deadline);
      const who = round.closedAt !== null ? roster.map((entry) => entry.userId) : sent.map((move) => move.userId);
      return {
        index: round.index,
        lightsAt: round.lightsAt,
        signalAt: round.signalAt,
        closedAt: round.closedAt,
        raceAt: round.raceAt,
        nextAt: round.nextAt,
        starts: who.map((id) => {
          const start = largadaStart(sent.find((move) => move.userId === id));
          return { userId: id, outcome: start.outcome, reactionMs: start.reactionMs };
        }),
      };
    }),
    standings: standingViews(largadaStandings(roster, starts, closed)),
  };
}

/**
 * Diez Letras: the letters (from a moment before it opens), my words and
 * everyone's points; nobody sees the others' words until the time is up.
 */
function lettersView(match: BattleMatch, words: readonly BattleWord[], flow: MatchFlow<LettersRoundFlow>, userId: string, now: number): LettersMatchView {
  const roster = rosterOf(match);
  const found = lettersPlayed(words);
  const round = flow.rounds[0] ?? null;
  const { letters } = match.content as BattleLettersContent;
  const byLength = (a: { word: string }, b: { word: string }) => b.word.length - a.word.length || a.word.localeCompare(b.word, "es");
  const finders = new Map<string, number>();
  for (const one of found) finders.set(one.word, (finders.get(one.word) ?? 0) + 1);
  return {
    game: "seven-letters",
    id: match.id,
    startsAt: match.startsAt,
    endsAt: flow.endsAt,
    players: match.players,
    durationMs: BATTLE_RULES.letters.durationMs,
    minWordLength: TEN_LETTERS_RULES.minWordLength,
    letters: now >= match.startsAt - BATTLE_RULES.letters.earlyMs ? letters : null,
    round,
    mine: found.filter((one) => one.userId === userId).map((one) => ({ word: one.word, points: lettersPoints(one.word) })),
    // At the end, everyone's words, with the rude ones of the others hidden (a word can't be a message).
    found: round?.closed
      ? roster.map(({ userId: id }) => ({
          userId: id,
          words: found
            .filter((one) => one.userId === id)
            .sort(byLength)
            .map((one) => ({ word: id === userId || !isPhraseBlocked(one.word) ? one.word : null, points: lettersPoints(one.word), onlyOne: finders.get(one.word) === 1 })),
        }))
      : null,
    standings: standingViews(lettersStandings(roster, found)),
  };
}

function matchView(match: BattleMatch, plays: Plays, flow: Flow, userId: string, now: number): MatchView {
  switch (flow.game) {
    case "five-questions":
      return triviaView(match, plays.moves, flow.flow, userId);
    case "reflexes":
      return largadaView(match, plays.moves, flow.flow);
    case "seven-letters":
      return lettersView(match, plays.words, flow.flow, userId, now);
    default:
      return unknownGame(flow);
  }
}

function playerViews(loaded: Loaded, match: BattleMatch | null, stage: BattleStage, userId: string, now: number): BattlePlayerView[] {
  const inMatch = new Set(match && stage !== "lobby" ? match.players : []);
  return loaded.players
    .filter((player) => player.leftAt === null || inMatch.has(player.userId))
    .map((player) => ({
      userId: player.userId,
      username: player.username,
      avatar: avatarOf(player.avatar),
      article: player.article,
      host: player.userId === loaded.battle.hostId,
      me: player.userId === userId,
      online: player.leftAt === null && (player.userId === userId || now - player.seenAt <= BATTLE_RULES.onlineMs),
      inRoom: player.leftAt === null,
      playing: inMatch.has(player.userId) && match?.departures[player.userId] === undefined,
    }));
}

/** The room as this player sees it now. Asking also says their phone is still there. */
export async function battleState(db: Queryable, user: User, battleId: string, ctx: BattleContext): Promise<BattleView> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requirePlayer(loaded, user);
  await touchBattlePlayer(db, battleId, user.id, ctx.now, SEEN_EVERY_MS);
  const { match, flow } = await current(db, loaded, ctx.now);
  const stage = stageOf(loaded.battle, match);
  const shown = match && flow && stage !== "lobby" ? matchView(match, loaded.plays, flow, user.id, ctx.now) : null;
  const wins = stage === "podium" && loaded.battle.groupId ? await groupBattleWins(db, loaded.battle.groupId) : null;
  return {
    id: loaded.battle.id,
    code: loaded.battle.code,
    group: await groupInfo(db, loaded.battle.groupId),
    game: isBattleGame(loaded.battle.game) ? loaded.battle.game : "reflexes",
    maxPlayers: BATTLE_RULES.maxPlayers,
    minPlayers: BATTLE_RULES.minPlayers,
    players: playerViews(loaded, match, stage, user.id, ctx.now),
    hostId: loaded.battle.hostId,
    meId: user.id,
    stage,
    match: shown,
    wins,
    serverAt: ctx.now,
    serverNow: Date.now(),
  };
}

/* ───────────── Playing ───────────── */

/** Someone who plays this match and didn't leave it. */
function requireInMatch(match: BattleMatch | null, userId: string, game: BattleGame): BattleMatch {
  if (!match || match.endedAt !== null || match.game !== game) throw new HttpError(409, "no-match");
  if (!match.players.includes(userId)) throw new HttpError(403, "not-in-match");
  if (match.departures[userId] !== undefined) throw new HttpError(403, "left-match");
  return match;
}

/**
 * A question of Cinco Preguntas, with this player's order of options. Its
 * clock starts the first time they get it (or when it opens, if a phone
 * asked a moment early).
 */
export async function battleQuestion(db: Queryable, user: User, battleId: string, round: number, ctx: BattleContext): Promise<TriviaQuestionView> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requirePlayer(loaded, user);
  const match = requireInMatch(loaded.match, user.id, "five-questions");
  const flowNow = triviaFlow({ startsAt: match.startsAt, roster: rosterOf(match), moves: triviaMoves(loaded.plays.moves), now: ctx.now });
  const soon = triviaFlow({ startsAt: match.startsAt, roster: rosterOf(match), moves: triviaMoves(loaded.plays.moves), now: ctx.now + BATTLE_RULES.trivia.earlyMs });
  const open = flowNow.rounds.find((one) => one.index === round && !one.closed) ?? soon.rounds.find((one) => one.index === round && !one.closed && one.opensAt > ctx.now);
  if (!open) throw new HttpError(409, flowNow.rounds.some((one) => one.index === round) ? "round-closed" : "too-early");
  await markShown(db, { matchId: match.id, userId: user.id, round, at: Math.max(ctx.now, open.opensAt) });
  const { questionIds } = match.content as BattleTriviaContent;
  const question = questionById(questionIds[round]!);
  return {
    index: round,
    prompt: question.prompt,
    category: categoryLabel(question),
    options: playerOptions(match.id, user.id, round, question).options,
    opensAt: open.opensAt,
    answerUntil: open.opensAt + BATTLE_RULES.trivia.answerMs,
  };
}

/** An answer, in this player's order of options. Nobody sees if it was right until the question closes. */
export async function battleAnswer(db: Queryable, user: User, battleId: string, round: number, choice: number, ctx: BattleContext): Promise<{ ok: true }> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requirePlayer(loaded, user);
  const match = requireInMatch(loaded.match, user.id, "five-questions");
  const flow = triviaFlow({ startsAt: match.startsAt, roster: rosterOf(match), moves: triviaMoves(loaded.plays.moves), now: ctx.now });
  const open = flow.rounds.find((one) => one.index === round && !one.closed);
  if (!open || ctx.now > open.opensAt + BATTLE_RULES.trivia.answerMs + BATTLE_RULES.trivia.graceMs) throw new HttpError(409, "round-closed");
  const { questionIds } = match.content as BattleTriviaContent;
  const { order } = playerOptions(match.id, user.id, round, questionById(questionIds[round]!));
  const canonical = order[choice];
  if (canonical === undefined) throw new HttpError(400, "invalid-choice");
  if (!(await recordAnswer(db, { matchId: match.id, userId: user.id, round, at: ctx.now, choice: canonical }))) throw new HttpError(409, "already-answered");
  return { ok: true };
}

/**
 * A start of Largada. The phone measures the reaction from the frame where
 * the lights went out; a reaction that reached the server before it could
 * have happened counts as jumped.
 */
export async function battleStart(
  db: Queryable,
  user: User,
  battleId: string,
  input: { round: number; reactionMs: number | null; falseStart: boolean },
  ctx: BattleContext,
): Promise<{ ok: true }> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requirePlayer(loaded, user);
  const match = requireInMatch(loaded.match, user.id, "reflexes");
  const { delaysMs } = match.content as BattleLargadaContent;
  const flow = largadaFlow({ startsAt: match.startsAt, delaysMs, roster: rosterOf(match), moves: largadaMoves(loaded.plays.moves), now: ctx.now });
  const round = flow.rounds.find((one) => one.index === input.round && one.closedAt === null);
  if (!round || ctx.now < round.lightsAt || ctx.now > round.deadline) throw new HttpError(409, "round-closed");
  let { reactionMs, falseStart } = input;
  if (!falseStart) {
    if (reactionMs === null || !Number.isFinite(reactionMs) || reactionMs < 0) reactionMs = null;
    else if (ctx.now < round.signalAt + reactionMs - BATTLE_RULES.largada.clockToleranceMs) {
      console.warn(JSON.stringify({ event: "suspicious-battle-start", battle: battleId, user: user.id, round: input.round, reactionMs, early: round.signalAt + reactionMs - ctx.now }));
      falseStart = true;
      reactionMs = null;
    }
  }
  const ok = await recordStart(db, { matchId: match.id, userId: user.id, round: input.round, at: ctx.now, reactionMs: falseStart ? null : reactionMs === null ? null : Math.round(reactionMs), falseStart });
  if (!ok) throw new HttpError(409, "already-played");
  return { ok: true };
}

/**
 * A word of Diez Letras, checked against the match's letters. It counts if
 * it's valid, new for this player and in time; the others only see the
 * points until the time is up.
 */
export async function battleWord(db: Queryable, user: User, battleId: string, raw: string, ctx: BattleContext): Promise<BattleWordResponse> {
  const loaded = await load(db, battleId);
  requireOpen(loaded.battle);
  requirePlayer(loaded, user);
  const match = requireInMatch(loaded.match, user.id, "seven-letters");
  const round = lettersFlow({ startsAt: match.startsAt, roster: rosterOf(match), now: ctx.now }).rounds[0];
  if (!round) throw new HttpError(409, "too-early");
  if (round.closed) throw new HttpError(409, "round-closed");

  const word = normalizeWord(raw) ?? "";
  if (word.length < TEN_LETTERS_RULES.minWordLength) return { word, status: "too-short", points: 0 };
  const valid = lettersWords((match.content as BattleLettersContent).letters);
  if (!valid.has(word)) return { word, status: "invalid", points: 0 };
  // A repeat already counted: it says how much, for a phone whose first try lost its answer.
  const repeat: BattleWordResponse = { word, status: "duplicate", points: lettersPoints(word) };
  const mine = loaded.plays.words.filter((one) => one.userId === user.id);
  if (mine.some((one) => one.word === word)) return repeat;
  if (mine.length >= BATTLE_RULES.letters.maxWords) throw new HttpError(429, "too-many-words");
  if (!(await recordWord(db, { matchId: match.id, userId: user.id, word, at: ctx.now }))) return repeat;

  // Almost every word of a big set in 90 seconds, as in the daily challenge: noted once, when it happens.
  const share = BATTLE_RULES.letters.suspiciousShare;
  if (valid.size >= 20 && mine.length + 1 > valid.size * share && mine.length <= valid.size * share) {
    console.warn(JSON.stringify({ event: "suspicious-battle-words", battle: battleId, user: user.id, found: mine.length + 1, of: valid.size }));
  }
  return { word, status: "valid", points: lettersPoints(word) };
}

/* ───────────── A group's battles ───────────── */

/** The group's live room (for the card) and its tally: battles won by each member, and the last ones. */
export async function groupBattles(db: Queryable, user: User, groupId: string, ctx: BattleContext): Promise<GroupBattlesResponse> {
  const membership = await getMembership(db, groupId, user.id);
  if (!membership || membership.leftAt !== null) throw new HttpError(404, "group-not-found");

  // Matches everyone left before the podium are written down here.
  for (const stale of await unendedGroupMatches(db, groupId, ctx.now - SETTLE_AFTER_MS)) {
    const plays = await playsOf(db, stale);
    const flow = flowOf(stale, plays, ctx.now);
    await settle(db, stale, plays, flow.flow.endsAt ?? ctx.now);
  }

  const [open, members, wins, recent] = await Promise.all([
    openGroupBattle(db, groupId, ctx.now - LIVE_MS),
    groupPlayers(db, groupId),
    groupBattleWins(db, groupId),
    groupRecentMatches(db, groupId, 10),
  ]);

  let live: LiveBattleView | null = null;
  if (open) {
    const players = present(await battlePlayers(db, open.id));
    const match = await latestMatch(db, open.id);
    const host = players.find((player) => player.userId === open.hostId) ?? players[0];
    if (host) {
      live = {
        battleId: open.id,
        hostName: host.username,
        game: isBattleGame(open.game) ? open.game : "reflexes",
        players: players.map((player) => ({ userId: player.userId, username: player.username, avatar: avatarOf(player.avatar) })),
        playing: match !== null && match.endedAt === null,
        in: players.some((player) => player.userId === user.id),
      };
    }
  }

  const won = new Map(wins.map((row) => [row.userId, row.wins]));
  return {
    live,
    wins: members
      .map((member) => ({ userId: member.userId, username: member.username, avatar: avatarOf(member.avatar), wins: won.get(member.userId) ?? 0, isMe: member.userId === user.id }))
      .sort((a, b) => b.wins - a.wins || a.username.localeCompare(b.username, "es")),
    recent: recent.map((match) => ({
      id: match.id,
      game: isBattleGame(match.game) ? match.game : "reflexes",
      endedAt: match.endedAt,
      players: match.players,
      winners: match.winners,
    })),
  };
}
