/**
 * Black-Scholes call option greeks + theoretical price.
 * Uses Abramowitz & Stegun erf approximation (max error ~1.5e-7).
 */

function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

/** Standard normal CDF */
const Φ = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

/** Standard normal PDF */
const φ = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/**
 * @param {number} S  Spot price
 * @param {number} K  Strike price
 * @param {number} T  Time to expiry in years
 * @param {number} σ  Implied volatility (decimal, e.g. 0.62)
 * @param {number} r  Risk-free rate (decimal, e.g. 0.05)
 * @returns {{ Δ, Γ, Θ, ν, price }}
 */
export function calcGreeks(S, K, T, σ, r) {
  if (T <= 0 || S <= 0) {
    return { Δ: 0, Γ: 0, Θ: 0, ν: 0, price: Math.max(0, S - K) };
  }

  const sq = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * σ * σ) * T) / (σ * sq);
  const d2 = d1 - σ * sq;

  return {
    Δ:     Φ(d1),
    Γ:     φ(d1) / (S * σ * sq),
    Θ:    (-(S * φ(d1) * σ) / (2 * sq) - r * K * Math.exp(-r * T) * Φ(d2)) / 365,
    ν:     (S * φ(d1) * sq) / 100,           // per 1% IV move
    price: S * Φ(d1) - K * Math.exp(-r * T) * Φ(d2),
  };
}
