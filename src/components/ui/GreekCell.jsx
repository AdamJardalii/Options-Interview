import { useState } from 'react';
import { C } from '../../design/tokens';

/**
 * Single greek tile with a plain-English tooltip on hover.
 * @param {{ label: string, value: number, fmt?: (v:number)=>string, tip: string }} props
 */
export function GreekCell({ label, value, fmt, tip }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        position: 'relative', cursor: 'default',
        background: C.bg,
        border: `1px solid ${hover ? C.borderHi : C.border}`,
        borderRadius: 6, padding: '10px 12px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 18, fontWeight: 600, color: C.text,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmt ? fmt(value) : value.toFixed(4)}
      </div>

      {hover && (
        <div
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)',
            // Right-align on cells in the right column to avoid overflow
            left: 0, right: 'auto',
            background: C.surfaceAlt, border: `1px solid ${C.borderHi}`,
            borderRadius: 6, padding: '9px 12px',
            fontSize: 12, color: C.muted, lineHeight: 1.55,
            width: 'min(220px, 80vw)', zIndex: 50,
            boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}
