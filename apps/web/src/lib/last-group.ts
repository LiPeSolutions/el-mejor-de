/*
 * The last group the player opened, to run Largada against it. Each
 * browser remembers its own; without one, the server takes the first group.
 */

const KEY = "emd:ultimo-grupo";

export function lastGroupId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberGroup(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked: Largada uses the first group.
  }
}
