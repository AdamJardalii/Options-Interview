import { C } from '../../design/tokens';
import { Tag } from '../ui/Tag';

const IV_RANGE_LOW  = 0.30;
const IV_RANGE_HIGH = 1.20;

/**
 * @param {{ iv: number, live: boolean }} props
 *   iv   — live IV from Deribit (decimal) or TRADE.iv fallback
 *   live — true when the value came from the exchange, false when BSM/config
 */
export function IVIndicator({ iv, live }) {
  const markerPct = Math.min(
    Math.max(((iv - IV_RANGE_LOW) / (IV_RANGE_HIGH - IV_RANGE_LOW)) * 100, 2),
    98
  );

  // Position label: where is current IV in its range?
  const ivRangePct = (iv - IV_RANGE_LOW) / (IV_RANGE_HIGH - IV_RANGE_LOW);
  const rangeLabel = ivRangePct < 0.33 ? 'LOW' : ivRangePct < 0.66 ? 'MID' : 'HIGH';
  const rangeColor = ivRangePct < 0.33 ? C.bullish : ivRangePct < 0.66 ? C.strike : C.bearish;

  return (
    <div
      style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '12px 16px', marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
            Implied Volatility
          </span>
          {live
            ? <span style={{ fontSize: 10, color: C.bullish, background: `${C.bullish}15`, border: `1px solid ${C.bullish}30`, padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>LIVE</span>
            : <span style={{ fontSize: 10, color: C.muted }}>BSM est.</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 22, fontWeight: 700, color: C.accent,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {(iv * 100).toFixed(1)}%
          </span>
          <Tag color={rangeColor}>{rangeLabel}</Tag>
        </div>
      </div>

      {/* Range bar */}
      <div style={{ position: 'relative', height: 6, borderRadius: 3 }}>
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 3,
            background: `linear-gradient(to right, ${C.bullish}55, ${C.strike}55, ${C.bearish}55)`,
          }}
        />
        <div
          style={{
            position: 'absolute', top: '50%', left: `${markerPct}%`,
            transform: 'translate(-50%, -50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: C.accent, border: `2px solid ${C.bg}`,
            boxShadow: `0 0 0 3px ${C.accent}30`,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 6, fontSize: 10, color: C.muted,
        }}
      >
        <span>30% Low</span>
        <span>75% Mid</span>
        <span>120% High</span>
      </div>
    </div>
  );
}
