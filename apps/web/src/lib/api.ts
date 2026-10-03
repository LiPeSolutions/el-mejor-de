import type { Article, Avatar, GroupColor, GroupEmblem } from "@repo/shared";
import type { AccountResponse, AvailabilityResponse } from "./account-types";
import type {
  AnswerResponse,
  FinishResponse,
  LevelResponse,
  QuestionResponse,
  StartResponse,
  WordCheckResponse,
} from "./challenge-types";
import type { GameSlug } from "./games";
import type {
  CrownsResponse,
  GroupCreatedResponse,
  GroupDetailResponse,
  GroupsResponse,
  InvitePreview,
  JoinResponse,
} from "./group-types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** The rest of the error body, e.g. the attempt already played. */
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

async function send<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
  );
  const data = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new ApiError(response.status, data.error ?? "network", data);
  return data as T;
}

const post = <T>(path: string, body: unknown) => send<T>(`/api/retos/${path}`, body);

export const api = {
  startDaily: (slot: number) => post<StartResponse>("empezar", { mode: "daily", slot }),
  startPractice: (game: GameSlug) => post<StartResponse>("empezar", { mode: "practice", game }),
  checkWord: (token: string, word: string) => post<WordCheckResponse>("palabra", { token, word }),
  question: (token: string, index: number) => post<QuestionResponse>("pregunta", { token, index }),
  answer: (token: string, questionToken: string, choice: number | null) =>
    post<AnswerResponse>("respuesta", { token, questionToken, choice }),
  level: (token: string, level: number, inputs: number[]) => post<LevelResponse>("nivel", { token, level, inputs }),
  finish: (token: string, log: unknown) => post<FinishResponse>("terminar", { token, log }),
};

export const accountApi = {
  /** Who is signed in; with `history`, also the recent attempts. */
  me: (history = false) => send<AccountResponse>(history ? "/api/cuenta?historial=1" : "/api/cuenta"),
  create: (input: { username: string; password: string; avatar: Avatar; article: Article }) =>
    send<AccountResponse>("/api/cuenta/crear", input),
  signIn: (username: string, password: string) => send<AccountResponse>("/api/cuenta/entrar", { username, password }),
  signOut: () => send<AccountResponse>("/api/cuenta/salir", {}),
  availability: (username: string) => send<AvailabilityResponse>(`/api/cuenta/apodo?nombre=${encodeURIComponent(username)}`),
  updateProfile: (changes: { avatar?: Avatar; article?: Article }) => send<AccountResponse>("/api/cuenta/perfil", changes),
};

export interface GroupFields {
  name: string;
  emblem: GroupEmblem;
  color: GroupColor;
}

const group = (id: string, action = "") => `/api/grupos/${encodeURIComponent(id)}${action}`;
const invitation = (code: string) => `/api/invitaciones/${encodeURIComponent(code.trim())}`;

export const groupsApi = {
  list: () => send<GroupsResponse>("/api/grupos"),
  create: (fields: GroupFields) => send<GroupCreatedResponse>("/api/grupos", fields),
  detail: (id: string) => send<GroupDetailResponse>(group(id)),
  edit: (id: string, fields: Partial<GroupFields>) => send<GroupCreatedResponse>(group(id), fields),
  renewInvite: (id: string) => send<GroupCreatedResponse>(group(id, "/invitacion"), {}),
  leave: (id: string) => send<{ ok: true }>(group(id, "/salir"), {}),
  remove: (id: string, userId: string) => send<{ ok: true }>(group(id, "/sacar"), { userId }),
  preview: (code: string) => send<InvitePreview>(invitation(code)),
  join: (code: string) => send<JoinResponse>(invitation(code), {}),
  crowns: () => send<CrownsResponse>("/api/coronas"),
  crownSeen: (id: string) => send<{ ok: true }>("/api/coronas/vista", { id }),
};
