import { PASSWORD_RULES, USERNAME_RULES, type PasswordProblem, type UsernameProblem } from "@repo/shared";
import { ApiError } from "./api";

/** What players read when an apodo, a password or an account request doesn't work. */

export function usernameProblemText(problem: UsernameProblem | "taken"): string {
  switch (problem) {
    case "too-short":
      return `Tiene que tener al menos ${USERNAME_RULES.minLength} letras.`;
    case "too-long":
      return `Puede tener hasta ${USERNAME_RULES.maxLength} caracteres.`;
    case "invalid":
      return "Solo letras, números, puntos y guiones bajos, sin espacios.";
    case "needs-letter":
      return "Tiene que tener alguna letra.";
    case "not-allowed":
      return "Ese apodo no se puede usar. Probá con otro.";
    case "taken":
      return "Ya lo usa otra persona. Probá con otro.";
  }
}

export function passwordProblemText(problem: PasswordProblem): string {
  switch (problem) {
    case "too-short":
      return `Tiene que tener al menos ${PASSWORD_RULES.minLength} caracteres.`;
    case "too-long":
      return "Es demasiado larga.";
    case "too-common":
      return "Es muy fácil de adivinar. Probá con otra.";
    case "same-as-username":
      return "No puede ser igual a tu apodo.";
  }
}

/** For the account requests: a message for each error the server can answer. */
export function accountErrorText(cause: unknown): string {
  if (!(cause instanceof ApiError)) return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
  switch (cause.code) {
    case "wrong-credentials":
      return "El apodo o la contraseña no coinciden.";
    case "too-many-attempts":
      return "Probaste muchas veces. Esperá unos minutos y volvé a intentar.";
    case "too-many-signups":
      return "Se crearon muchas cuentas desde este celu. Probá de nuevo mañana.";
    case "username-taken":
      return usernameProblemText("taken");
    case "invalid-username":
      return usernameProblemText((cause.details.problem as UsernameProblem) ?? "invalid");
    case "invalid-password":
      return passwordProblemText((cause.details.problem as PasswordProblem) ?? "too-short");
    case "accounts-unavailable":
      return "Las cuentas no están disponibles en este momento.";
    case "signed-out":
      return "Se cerró tu sesión. Entrá de nuevo.";
    default:
      return "Algo salió mal. Probá de nuevo en un rato.";
  }
}
