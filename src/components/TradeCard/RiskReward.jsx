import { C, TRADE } from '../../design/tokens';
import { f$ } from '../../lib/fmt';

/**
 * @param {{ breakeven: number, premium: number }} props
 */
export function RiskReward({ breakeven, premium }) {
  return (
    <div
      style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '12px 16px', marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12 }}>
        Risk / Reward
      </div>

      <div
        className="sg3"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}
      >
        <div style={{ textAlign: 'center', paddingRight: 12 }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max Loss</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.bearish }}>
            {f$(premium * TRADE.contracts)}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>premium paid</div>
        </div>

        <div
          className="rr-divider"
          style={{
            textAlign: 'center',
            borderLeft: `1px solid ${C.border}`,
            borderRight: `1px solid ${C.border}`,
            paddingLeft: 12, paddingRight: 12,
          }}
        >
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Breakeven</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.strike }}>
            {f$(breakeven)}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>at expiry</div>
        </div>

        <div style={{ textAlign: 'center', paddingLeft: 12 }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max Gain</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.bullish }}>
            Uncapped
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>long call</div>
        </div>
      </div>
    </div>
  );
}
