import { brand } from "@/config/brand";
import { formatNumber } from "./format";

const GAME_EMOJI: Record<string, string> = {
  "seven-letters": "🔤",
  "five-questions": "❓",
  reflexes: "⚡",
  sequence: "🟨",
};

/** "Hice 2.640 en El Mejor de · Día 2 ¿Me ganás?" plus a line per game. */
export function dayShareText(dayNumber: number, results: Array<{ game: string; score: number }>): string {
  const total = results.reduce((sum, result) => sum + result.score, 0);
  const games = results.map((result) => `${GAME_EMOJI[result.game] ?? "•"} ${formatNumber(result.score)}`).join(" · ");
  return `👑 Hice ${formatNumber(total)} en ${brand.name} · Día ${dayNumber}\n${games}\n¿Me ganás?`;
}

/** Native share sheet when available; otherwise copies to the clipboard. */
export async function shareOrCopy(text: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `https://${brand.domain}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: brand.name, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      return "copied";
    } catch {
      return "failed";
    }
  }
}
