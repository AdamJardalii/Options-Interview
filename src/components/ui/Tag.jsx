import { C } from '../../design/tokens';

/** Small label pill. color drives both text and tinted background/border. */
export function Tag({ children, color = C.accent }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 7px', borderRadius: 4,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
        color,
        background: color + '1A',
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}
