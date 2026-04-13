import { C, TRADE } from '../../design/tokens';
import { f$, fPct } from '../../lib/fmt';

/**
 * Four illustrative price targets showing required BTC move, P&L, and return multiple.
 * @param {{ price: number|null, premium: number }} props
 */
export function ReturnScenarios({ price, premium }) {
  const S = price ?? TRADE.strike * 0.942;

  // Four canonical scenarios for a long call
  const scenarios = [
    {
      label:  'At Strike',
      target: TRADE.strike,
      pnl:    -premium,                   // expires worthless
      note:   'expires worthless',
    },
    {
      label:  'Breakeven',
      target: TRADE.strike + premium,
      pnl:    0,
      note:   'recover cost',
    },
    {
      label:  '×2 Return',
      target: TRADE.strike + premium * 2, // intrinsic = 2× premium
      pnl:    premium,                    // net: +100 %
      note:   '+100% on premium',
    },
    {
      label:  '×5 Return',
      target: TRADE.strike + premium * 6, // intrinsic = 6× premium → net 5×
      pnl:    premium * 5,
      note:   '+500% on premium',
    },
  ];

  // Max gain used to scale progress bars (skip loss bar for negative pnl)
  const maxPnl = scenarios[scenarios.length - 1].pnl;

  return (
    <div
      style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '12px 16px', marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12 }}>
        Potential Return Scenarios
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scenarios.map(({ label, target, pnl, note }) => {
          const movePct  = ((target - S) / S) * 100;
          const retPct   = (pnl / premium) * 100;
          const isProfit = pnl > 0;
          const isZero   = pnl === 0;
          const barPct   = isProfit ? Math.min((pnl / maxPnl) * 100, 100) : 0;
          const retColor = isProfit ? C.bullish : isZero ? C.muted : C.bearish;

          return (
            <div key={label}>
              {/* Top row: label | BTC target | move | P&L | return */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr auto auto',
                  alignItems: 'center',
                  gap: '0 8px',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </span>
                <span style={{ fontSize: 11, color: C.text, fontVariantNumeric: 'tabular-nums', minWidth: 0 }}>
                  {f$(target)}{' '}
                  <span style={{ color: movePct > 0 ? C.strike : C.muted, fontSize: 10 }}>
                    {movePct > 0 ? `+${movePct.toFixed(1)}%` : `${movePct.toFixed(1)}%`}
                  </span>
                </span>
                <span style={{ fontSize: 11, color: retColor, fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {pnl === 0 ? '$0' : (pnl > 0 ? '+' : '') + f$(pnl, 0)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: retColor, fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 48 }}>
                  {retPct === 0 ? '0%' : fPct(retPct)}
                </span>
              </div>

              {/* Progress bar — only for profitable scenarios */}
              <div style={{ height: 3, borderRadius: 2, background: `${C.border}` }}>
                {isProfit && (
                  <div
                    style={{
                      height: '100%', borderRadius: 2,
                      width: `${barPct}%`,
                      background: `linear-gradient(to right, ${C.bullish}88, ${C.bullish})`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                )}
              </div>

              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
