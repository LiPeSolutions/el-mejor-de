const numberFormat = new Intl.NumberFormat("es-AR");

/** "2.640" */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "07:42:15" for the next-challenges countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** "0:47" for game clocks. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
