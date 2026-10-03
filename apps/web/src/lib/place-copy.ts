import type { Article } from "@repo/shared";
import { ApiError } from "./api";
import { formatNumber } from "./format";
import type { PlaceRankingRow } from "./place-types";

/** What players read about the rankings of their place. */

export function placeErrorText(cause: unknown): string {
  if (!(cause instanceof ApiError)) return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
  switch (cause.code) {
    case "accounts-unavailable":
      return "El ranking no está disponible en este momento.";
    case "signed-out":
      return "Se cerró tu sesión. Entrá de nuevo.";
    default:
      return "Algo salió mal. Probá de nuevo en un rato.";
  }
}

/** "Vas primero por 40" or "A 70 de Tincho": how far the player is from the one right above. */
export function gapText(rows: readonly PlaceRankingRow[], me: PlaceRankingRow, article: Article): string {
  if (me.position === 1) {
    const first = article === "la" ? "primera" : "primero";
    const second = rows.find((row) => row.position === 2);
    if (!second) return `Vas ${first}`;
    return second.score < me.score ? `Vas ${first} por ${formatNumber(me.score - second.score)}` : `Empatás con ${second.username}, pero llegaste antes`;
  }
  // The rows are the top and a few more, so the one right above may be missing: the nearest one above.
  const above = rows.filter((row) => row.position < me.position);
  const next = above[above.length - 1];
  if (!next) return `Vas #${me.position}`;
  return next.score > me.score ? `A ${formatNumber(next.score - me.score)} de ${next.username}` : `Empatás con ${next.username}, que llegó antes`;
}
