/** Dollar formatter. f$(88000) → "$88,000", f$(1200.5, 2) → "$1,200.50" */
export const f$ = (n, d = 0) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Signed percent. fPct(6.02) → "+6.0%", fPct(-2.5) → "-2.5%" */
export const fPct = (n, d = 1) => (n >= 0 ? '+' : '') + n.toFixed(d) + '%';

/** Countdown from milliseconds: "6d 14h" / "3h 20m" / "45m" */
export function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** HH:MM from Unix ms timestamp */
export const hhmm = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
