/**
 * TradeCard/index.jsx — composition root.
 *
 * Data priority (live-first, graceful fallback):
 *   IV      → Deribit mark_iv  → TRADE.iv (config)
 *   Premium → Deribit markUSD  → TRADE.premium (config)
 *   Greeks  → Deribit greeks   → BSM approximation
 *
 * Nothing below this file knows about useBTC, useDeribit, calcGreeks, or share logic.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { C, TRADE, buildThemeCSS } from '../../design/tokens';
import { calcGreeks } from '../../lib/bsm';
import { getDeribitInstrument } from '../../lib/instrument';
import { f$, fPct, countdown } from '../../lib/fmt';
import { useBTC }     from '../../hooks/useBTC';
import { useDeribit } from '../../hooks/useDeribit';
import { useTheme }   from '../../hooks/useTheme';

import { Header }          from './Header';
import { Headline }        from './Headline';
import { DecayWarning }    from './DecayWarning';
import { PriceChart }      from './PriceChart';
import { StatsRow }        from './StatsRow';
import { RiskReward }      from './RiskReward';
import { ReturnScenarios } from './ReturnScenarios';
import { IVIndicator }     from './IVIndicator';
import { GreeksPanel }     from './GreeksPanel';
import { PayoffChart }     from './PayoffChart';
import { ActionFooter }    from './ActionFooter';

// Stable — doesn't change between renders
const INSTRUMENT = getDeribitInstrument();

const THEME_CSS = buildThemeCSS();

const GLOBAL_CSS = `
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.55; }
    70%  { transform: scale(2.4); opacity: 0;    }
    100% { transform: scale(2.4); opacity: 0;    }
  }
  @keyframes toast-in {
    from { transform: translate(-50%, 10px); opacity: 0; }
    to   { transform: translate(-50%, 0);    opacity: 1; }
  }
  *, *::before, *::after { box-sizing: border-box; }
  /* Smooth theme transitions */
  body, div, span, button, a {
    transition: background-color 0.22s ease, border-color 0.22s ease, color 0.22s ease;
  }
  [data-theme="light"] .trade-card {
    box-shadow: 0 4px 24px rgba(28,33,40,0.10), 0 1px 4px rgba(28,33,40,0.08) !important;
  }
  @media (max-width: 640px) {
    .card-padding   { padding: 16px !important; }
    .sg4            { grid-template-columns: repeat(2, 1fr) !important; }
    .sg3            { grid-template-columns: 1fr !important; gap: 12px !important; }
    .sg3 .rr-divider {
      border-left: none !important; border-right: none !important;
      border-top: 1px solid var(--c-border) !important;
      padding: 12px 0 0 !important;
    }
    .btns           { flex-direction: column !important; }
    .chart-h        { height: 180px !important; }
  }
  @media (max-width: 380px) {
    .chart-h        { height: 155px !important; }
  }
`;

export default function TradeCard() {
  // ── Data sources ─────────────────────────────────────────
  const { candles, price, loading, wsLive } = useBTC();
  const {
    iv:          liveIV,
    markUSD:     liveMarkUSD,
    liveGreeks,
    bid,
    ask,
    connected:   deribitLive,
  } = useDeribit(INSTRUMENT);

  const [, toggleTheme, theme] = useTheme();
  const [toast, setToast] = useState('');
  const [now,   setNow]   = useState(Date.now());
  const toastTimer = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── Live-first derived values ────────────────────────────
  const msLeft   = TRADE.expiry - now;
  const daysLeft = msLeft / 86_400_000;
  const T        = daysLeft / 365;
  const S        = price ?? TRADE.strike * 0.942;

  // Prefer Deribit data; fall back to config constants
  const iv      = liveIV      ?? TRADE.iv;
  const premium = liveMarkUSD ?? TRADE.premium;
  const ivLive  = liveIV      != null;

  // Prefer exchange-computed Greeks (smile-correct); fall back to BSM
  const bsmGreeks   = useMemo(() => calcGreeks(S, TRADE.strike, T, iv, TRADE.r), [S, T, iv]);
  const g           = liveGreeks ?? bsmGreeks;
  const greekSource = liveGreeks ? 'deribit' : 'bsm';

  const pop       = Math.round(g.Δ * 100);
  const dist      = ((TRADE.strike - S) / S) * 100;
  const breakeven = TRADE.strike + premium;

  // ── Toast ────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // ── Share ────────────────────────────────────────────────
  const share = useCallback(() => {
    const lines = [
      `BTC Options Trade Idea  [${INSTRUMENT}]`,
      `Direction: CALL  |  Strike: ${f$(TRADE.strike)}`,
      `Current: ${f$(S)}  |  Distance: ${fPct(dist)}`,
      `Expiry: ${countdown(msLeft)}  |  Mark: ${f$(premium, 0)}`,
      `Breakeven: ${f$(breakeven)}  |  PoP: ~${pop}%`,
      `IV: ${(iv * 100).toFixed(1)}%  (${ivLive ? 'Deribit live' : 'BSM est.'})`,
      bid && ask ? `Bid: ${f$(bid, 0)}  Ask: ${f$(ask, 0)}` : '',
    ].filter(Boolean);
    navigator.clipboard
      ?.writeText(lines.join('\n'))
      .then(() => showToast('Idea copied to clipboard'));
  }, [S, msLeft, dist, pop, breakeven, iv, ivLive, premium, bid, ask, showToast]);

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <style>{THEME_CSS + GLOBAL_CSS}</style>

      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            background: C.surfaceAlt, border: `1px solid ${C.bullish}44`,
            color: C.text, padding: '10px 20px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
            animation: 'toast-in 0.18s ease',
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Theme toggle — portalled to document.body so no ancestor can break position:fixed */}
      {createPortal(
        <div
          style={{
            position: 'fixed', top: 14, right: 16, zIndex: 1000,
            display: 'flex',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20, overflow: 'hidden',
            fontSize: 11, fontWeight: 600,
            userSelect: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        >
          {[['dark', '🌙 Dark'], ['light', '☀️ Light']].map(([val, label]) => {
            const active = theme === val;
            return (
              <button
                key={val}
                onClick={() => { if (!active) toggleTheme(); }}
                style={{
                  padding: '5px 13px',
                  border: 'none',
                  cursor: active ? 'default' : 'pointer',
                  background: active ? C.accent : 'transparent',
                  color: active ? '#fff' : C.muted,
                  transition: 'background 0.18s, color 0.18s',
                  letterSpacing: '0.03em',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      <div
        style={{
          background: C.bg, minHeight: '100vh',
          padding: '56px 16px 32px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          transition: 'background 0.25s ease',
        }}
      >
        <div
          className="trade-card"
          style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, maxWidth: 680, margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        >
          <Header instrument={INSTRUMENT} deribitLive={deribitLive} />

          <div className="card-padding" style={{ padding: '20px 24px' }}>
            <Headline pop={pop} iv={iv} ivLive={ivLive} premium={premium} />
            {daysLeft < 3 && <DecayWarning />}
            <PriceChart candles={candles} price={price} loading={loading} wsLive={wsLive} />
            <StatsRow price={price} msLeft={msLeft} premium={premium} bid={bid} ask={ask} />
            <RiskReward breakeven={breakeven} premium={premium} />
            <ReturnScenarios price={price} premium={premium} />
            <IVIndicator iv={iv} live={ivLive} />
            <GreeksPanel g={g} source={greekSource} />
            <PayoffChart breakeven={breakeven} premium={premium} />
            <ActionFooter onShare={share} />
          </div>
        </div>
      </div>
    </>
  );
}
