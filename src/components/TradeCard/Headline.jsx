import { C, TRADE } from '../../design/tokens';
import { f$ } from '../../lib/fmt';

/**
 * @param {{ pop: number, iv: number, ivLive: boolean, premium: number }} props
 */
export function Headline({ pop, iv, ivLive, premium }) {
  const expiryLabel = TRADE.expiry.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontSize: 22, fontWeight: 600, color: C.text,
            lineHeight: 1.3, flex: 1, margin: 0,
          }}
        >
          BTC will reach{' '}
          <span style={{ color: C.strike }}>{f$(TRADE.strike)}</span>
          {' '}by {expiryLabel}
        </h2>

        <span
          style={{
            display: 'inline-flex', alignItems: 'center',
            background: `${C.accent}18`, border: `1px solid ${C.accent}30`,
            color: C.accent, borderRadius: 100,
            padding: '4px 12px', fontSize: 12, fontWeight: 600,
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          ~{pop}% PoP
        </span>
      </div>

      <p style={{ marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 1.55, margin: '8px 0 0' }}>
        Long {TRADE.contracts} BTC call · {f$(premium, 0)} mark ·{' '}
        {(iv * 100).toFixed(0)}% IV{' '}
        <span style={{ color: ivLive ? C.bullish : C.muted, fontSize: 11 }}>
          ({ivLive ? 'Deribit live' : 'BSM est.'})
        </span>
      </p>
    </div>
  );
}
