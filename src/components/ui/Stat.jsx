import { C } from '../../design/tokens';

/** Compact labeled stat cell used in the stats row. */
export function Stat({ label, value, color = C.text }) {
  return (
    <div
      style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '10px 12px', textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 10, color: C.muted, marginBottom: 3,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14, fontWeight: 600, color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}
