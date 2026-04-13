import { C } from '../../design/tokens';

/** Animated green dot for the LIVE indicator. Requires the pulse-ring keyframe (injected by TradeCard). */
export function Pulse() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      <span
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: C.bullish, opacity: 0.55,
          animation: 'pulse-ring 1.8s ease-in-out infinite',
        }}
      />
      <span
        style={{
          position: 'relative', display: 'inline-block',
          width: 8, height: 8, borderRadius: '50%', background: C.bullish,
        }}
      />
    </span>
  );
}
