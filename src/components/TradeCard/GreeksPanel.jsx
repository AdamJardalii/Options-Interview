import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { C } from '../../design/tokens';
import { GreekCell } from '../ui/GreekCell';
import { f$ } from '../../lib/fmt';

/** Static definitions — label, accessor key, formatter, and plain-English tip. */
const GREEKS = [
  {
    key: 'Δ', label: 'Delta (Δ)',
    tip: 'How much the option price moves per $1 BTC move. Δ = 0.45 means you earn ~$0.45 for every $1 BTC rises. Also a rough proxy for the probability of expiring ITM.',
  },
  {
    key: 'Γ', label: 'Gamma (Γ)',
    fmt: (v) => v.toExponential(3),
    tip: 'Rate of change of delta per $1 BTC move. High gamma near expiry means your delta shifts fast — cuts both ways. Long gamma profits from large moves.',
  },
  {
    key: 'Θ', label: 'Theta (Θ)',
    fmt: (v) => f$(v, 2) + '/day',
    tip: 'Daily time decay cost. You lose this dollar amount every day you hold the option with no price move. Theta accelerates sharply in the last 30 days.',
  },
  {
    key: 'ν', label: 'Vega (ν)',
    fmt: (v) => f$(v, 2) + ' / 1%IV',
    tip: 'Sensitivity to implied volatility. Vega = $200 means a 1% spike in IV adds ~$200 to the option mark. Long options always benefit from IV expansion.',
  },
];

/**
 * @param {{ g: object, source: 'deribit' | 'bsm' }} props
 *   g      — { Δ, Γ, Θ, ν } — either exchange-computed or BSM
 *   source — where the values came from; shown as a badge in the toggle header
 */
export function GreeksPanel({ g, source }) {
  const [open, setOpen] = useState(false);
  const isLive = source === 'deribit';

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'transparent',
          border: `1px solid ${C.border}`, borderRadius: 6,
          padding: '9px 14px', cursor: 'pointer',
          color: C.muted, fontSize: 13, fontWeight: 500,
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.borderHi;
          e.currentTarget.style.color = C.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.color = C.muted;
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Greeks</span>
          {isLive
            ? <span style={{ fontSize: 10, color: C.bullish, background: `${C.bullish}15`, border: `1px solid ${C.bullish}30`, padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>Deribit</span>
            : <span style={{ fontSize: 10, color: C.muted }}>BSM est.</span>
          }
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 8, marginTop: 8,
          }}
        >
          {GREEKS.map(({ key, label, fmt, tip }) => (
            <GreekCell
              key={key}
              label={label}
              value={g[key]}
              fmt={fmt}
              tip={tip}
            />
          ))}
        </div>
      )}
    </div>
  );
}
