import { C } from '../../design/tokens';
import { Pulse } from '../ui/Pulse';
import { Tag } from '../ui/Tag';

/**
 * @param {{ instrument: string, deribitLive: boolean }} props
 *   instrument  — e.g. "BTC-24APR26-88000-C" shown as subtitle
 *   deribitLive — true when the Deribit WS is connected; dims the LIVE badge otherwise
 */
export function Header({ instrument, deribitLive }) {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        gap: 12, flexWrap: 'wrap',
      }}
    >
      {/* BTC logo */}
      <div
        style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(145deg, #F7931A, #D97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#fff',
          userSelect: 'none',
        }}
      >
        ₿
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>BTC / USD</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {instrument ?? 'Deribit Options'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${C.bullish}12`, border: `1px solid ${C.bullish}28`,
            padding: '3px 9px', borderRadius: 4,
            opacity: deribitLive ? 1 : 0.45,
            transition: 'opacity 0.4s',
          }}
        >
          <Pulse />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.bullish, letterSpacing: '0.06em' }}>
            {deribitLive ? 'LIVE' : 'CONNECTING'}
          </span>
        </div>
        <Tag color={C.muted}>7D</Tag>
        <Tag color={C.bullish}>▲ CALL</Tag>
      </div>
    </div>
  );
}
