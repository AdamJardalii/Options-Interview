import { Share2, ExternalLink } from 'lucide-react';
import { C } from '../../design/tokens';

export function ActionFooter({ onShare }) {
  return (
    <div className="btns" style={{ display: 'flex', gap: 8 }}>
      <a
        href="https://www.deribit.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6,
          background: C.accent, color: '#ffffff',
          borderRadius: 6, padding: '11px 16px',
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Trade on Deribit <ExternalLink size={13} />
      </a>

      <button
        onClick={onShare}
        style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6,
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.text, borderRadius: 6, padding: '11px 16px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = C.surfaceAlt;
          e.currentTarget.style.borderColor = C.borderHi;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = C.border;
        }}
      >
        <Share2 size={13} /> Share Idea
      </button>
    </div>
  );
}
