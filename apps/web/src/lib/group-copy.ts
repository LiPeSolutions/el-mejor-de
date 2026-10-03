import { GROUP_RULES, type GroupNameProblem } from "@repo/shared";
import { ApiError } from "./api";

/** What players read when a group name or a group request doesn't work. */

export function groupNameProblemText(problem: GroupNameProblem): string {
  switch (problem) {
    case "too-short":
      return `Tiene que tener al menos ${GROUP_RULES.nameMinLength} letras.`;
    case "too-long":
      return `Puede tener hasta ${GROUP_RULES.nameMaxLength} caracteres.`;
    case "invalid":
      return "Solo letras, números, espacios y signos simples (sin emojis).";
    case "needs-letter":
      return "Tiene que tener alguna letra.";
    case "not-allowed":
      return "Ese nombre no se puede usar. Probá con otro.";
  }
}

export function groupErrorText(cause: unknown): string {
  if (!(cause instanceof ApiError)) return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
  switch (cause.code) {
    case "invalid-group-name":
      return groupNameProblemText((cause.details.problem as GroupNameProblem) ?? "invalid");
    case "too-many-groups":
      return `Ya estás en ${GROUP_RULES.maxGroupsPerPlayer} grupos, que es el máximo. Salí de alguno para sumarte a otro.`;
    case "too-many-new-groups":
      return "Ya creaste muchos grupos hoy. Probá de nuevo mañana.";
    case "group-not-found":
      return "Este grupo no existe o ya no sos parte.";
    case "not-the-owner":
      return "Eso lo puede hacer solo quien administra el grupo.";
    case "invite-not-found":
      return "No encontramos un grupo con ese código. Revisalo o pedí uno nuevo.";
    case "invite-expired":
      return "Este link venció. Pedile uno nuevo a quien te invitó.";
    case "group-full":
      return `El grupo está lleno: ya tiene ${GROUP_RULES.maxMembers} miembros.`;
    case "removed-from-group":
      return "Te sacaron de este grupo. Para volver, pedile un link nuevo a quien lo administra.";
    case "too-many-codes":
      return "Probaste muchos códigos. Esperá un rato y volvé a intentar.";
    case "accounts-unavailable":
      return "Los grupos no están disponibles en este momento.";
    case "signed-out":
      return "Se cerró tu sesión. Entrá de nuevo.";
    default:
      return "Algo salió mal. Probá de nuevo en un rato.";
  }
}
