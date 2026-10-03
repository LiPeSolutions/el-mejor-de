import type { Article, Avatar } from "@repo/shared";
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
