import { C, TRADE } from '../../design/tokens';
import { f$, fPct, countdown } from '../../lib/fmt';
import { Stat } from '../ui/Stat';

/**
 * @param {{ price, msLeft, premium, bid, ask }} props
 *   premium — live mark price or config fallback
 *   bid/ask — live market quotes in USD, or null
 */
export function StatsRow({ price, msLeft, premium, bid, ask }) {
  const dist = price != null ? ((TRADE.strike - price) / price) * 100 : null;
  const spread = bid != null && ask != null ? ask - bid : null;

  return (
    <>
      {/* Primary stats */}
      <div
        className="sg4"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8, marginBottom: spread != null ? 8 : 16,
        }}
      >
        <Stat label="Current"  value={price != null ? f$(price) : '—'} />
        <Stat label="Strike"   value={f$(TRADE.strike)} color={C.strike} />
        <Stat label="Expiry"   value={countdown(msLeft)} />
        <Stat
          label="Distance"
          value={dist != null ? fPct(dist) : '—'}
          color={dist != null && dist > 0 ? C.accent : C.bullish}
        />
      </div>

      {/* Bid / Ask / Spread — only shown when Deribit data is live */}
      {spread != null && (
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8, marginBottom: 16,
          }}
        >
          <Stat label="Bid"    value={f$(bid,  0)} color={C.bullish} />
          <Stat label="Ask"    value={f$(ask,  0)} color={C.bearish} />
          <Stat label="Spread" value={f$(spread, 0)} color={C.muted} />
        </div>
      )}
    </>
  );
}
