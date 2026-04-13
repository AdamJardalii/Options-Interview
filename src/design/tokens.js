/**
 * Color system — CSS custom-property references.
 * Dark theme vars are on :root; light theme vars are on [data-theme="light"].
 * Every component reads `C.xxx` as a CSS var string — works in inline styles and SVG props.
 *
 * Chart-specific hex values (CHART) are separate because some Recharts internals
 * require resolved hex strings at mount time.
 */
export const C = {
  bg:         'var(--c-bg)',
  surface:    'var(--c-surface)',
  surfaceAlt: 'var(--c-surfaceAlt)',
  border:     'var(--c-border)',
  borderHi:   'var(--c-borderHi)',
  bullish:    'var(--c-bullish)',
  bearish:    'var(--c-bearish)',
  text:       'var(--c-text)',
  muted:      'var(--c-muted)',
  accent:     'var(--c-accent)',
  strike:     'var(--c-strike)',
};

/**
 * Resolved hex values for each theme — used only where CSS vars cannot be
 * evaluated at paint time (e.g. Recharts gradient stopColor, SVG stroke props).
 */
export const DARK = {
  bg:         '#0D1117',
  surface:    '#161B22',
  surfaceAlt: '#1C2128',
  border:     '#21262D',
  borderHi:   '#30363D',
  bullish:    '#3FB950',
  bearish:    '#F85149',
  text:       '#E6EDF3',
  muted:      '#8B949E',
  accent:     '#58A6FF',
  strike:     '#F0B429',
};

export const LIGHT = {
  bg:         '#EEF1F5',   // slightly blue-grey tint — softer than stark white
  surface:    '#FFFFFF',
  surfaceAlt: '#F3F6F9',
  border:     '#D8DEE4',
  borderHi:   '#B0BAC4',
  bullish:    '#1A7F37',
  bearish:    '#C92A2A',
  text:       '#1C2128',
  muted:      '#5E6B7A',
  accent:     '#0969DA',
  strike:     '#7D5800',   // darker amber — readable on white
};

/** CSS block that defines both themes — inject once via <style>. */
export function buildThemeCSS() {
  const vars = (palette) =>
    Object.entries(palette)
      .map(([k, v]) => `  --c-${k}: ${v};`)
      .join('\n');

  return `
    :root { ${vars(DARK)} }
    [data-theme="light"] { ${vars(LIGHT)} }
  `;
}

/**
 * Trade config — edit here to change the idea rendered by the card.
 * All components consume this; nothing is hardcoded in the UI layer.
 */
export const TRADE = {
  expiry:    new Date(Date.now() + 7 * 86_400_000),
  strike:    88_000,
  premium:   1_200,
  contracts: 1,
  iv:        0.62,   // implied volatility (decimal)
  r:         0.05,   // risk-free rate (decimal)
};
