import { AlertTriangle } from 'lucide-react';
import { C } from '../../design/tokens';

/** Amber warning strip shown when fewer than 3 days remain to expiry. */
export function DecayWarning() {
  return (
    <div
      style={{
        background: `${C.strike}0D`, border: `1px solid ${C.strike}38`,
        borderRadius: 6, padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: C.strike, marginBottom: 16,
      }}
    >
      <AlertTriangle size={14} />
      <span>
        <strong>Theta decay accelerating</strong> — last 72h before expiry
      </span>
    </div>
  );
}
