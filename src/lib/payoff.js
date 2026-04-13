import { TRADE } from '../design/tokens';

/**
 * Compute P&L curve at expiry for a long call.
 * pnl = max(0, price - K) - premium
 * 81 points across ±25% of strike — enough resolution for the mini-chart.
 *
 * @param {number} [premium] — live mark price, defaults to TRADE.premium
 */
export function buildPayoff(premium = TRADE.premium) {
  const K    = TRADE.strike;
  const lo   = K * 0.75;
  const hi   = K * 1.25;
  const step = (hi - lo) / 80;
  return Array.from({ length: 81 }, (_, i) => {
    const px  = lo + i * step;
    const pnl = Math.max(0, px - K) - premium;
    return { px, pnl };
  });
}
