/*
 * The live crown changes hands during the week. This browser remembers who
 * had it the last time it showed each group, to say "Juli te sacó la corona"
 * or "¡Le sacaste la corona a Juli!" once.
 */

const KEY = "emd:coronas-vistas";

interface SeenHolder {
  /** The week's Monday. */
  week: string;
  holderId: string | null;
  holderName: string | null;
}

export interface HolderNow {
  groupId: string;
  groupName: string;
  holderId: string | null;
  holderName: string | null;
}

export interface CrownNotice {
  groupId: string;
  kind: "lost" | "won";
  text: string;
}

function read(): Record<string, SeenHolder> {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as unknown;
    return typeof value === "object" && value !== null ? (value as Record<string, SeenHolder>) : {};
  } catch {
    return {};
  }
}

/** What changed since this browser last looked, for the signed-in player `meId`. */
export function crownNotices(week: string, holders: readonly HolderNow[], meId: string): CrownNotice[] {
  const seen = read();
  const notices: CrownNotice[] = [];
  for (const now of holders) {
    const before = seen[now.groupId];
    if (!before || before.week !== week || before.holderId === now.holderId) continue;
    if (before.holderId === meId && now.holderId && now.holderName) {
      notices.push({ groupId: now.groupId, kind: "lost", text: `${now.holderName} te sacó la corona de ${now.groupName}` });
    } else if (now.holderId === meId && before.holderName) {
      notices.push({ groupId: now.groupId, kind: "won", text: `¡Le sacaste la corona a ${before.holderName} en ${now.groupName}!` });
    }
  }
  return notices;
}

/** Remembers who has each crown now. */
export function rememberHolders(week: string, holders: readonly HolderNow[]): void {
  const seen = read();
  for (const now of holders) seen[now.groupId] = { week, holderId: now.holderId, holderName: now.holderName };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    // Storage blocked: the notices just don't show.
  }
}
