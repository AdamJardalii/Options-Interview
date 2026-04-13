import { TRADE } from '../design/tokens';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/**
 * Find the nearest Friday on or after a given date.
 * Deribit BTC options expire every Friday at 08:00 UTC.
 */
function nearestFriday(date) {
  const d = new Date(date);
  d.setUTCHours(8, 0, 0, 0);
  const dow = d.getUTCDay(); // 0=Sun … 5=Fri … 6=Sat
  const hop = dow === 5 ? 0 : (5 - dow + 7) % 7;
  d.setUTCDate(d.getUTCDate() + hop);
  return d;
}

/**
 * Build the Deribit instrument name for the current TRADE config.
 * Example output: "BTC-24APR26-88000-C"
 */
export function getDeribitInstrument() {
  const expiry = nearestFriday(TRADE.expiry);
  const day    = expiry.getUTCDate();
  const month  = MONTHS[expiry.getUTCMonth()];
  const year   = String(expiry.getUTCFullYear()).slice(-2);
  return `BTC-${day}${month}${year}-${TRADE.strike}-C`;
}
