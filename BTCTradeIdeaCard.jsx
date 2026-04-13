import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, ReferenceArea,
} from 'recharts';
import {
  Share2, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, Activity,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const C = {
  bg:         '#0D1117',
  surface:    '#161B22',
  surfaceAlt: '#1C2128',
  border:     '#21262D',
  borderHi:   '#30363D',
  bullish:    '#3FB950',
  bearish:    '#F85149',
  text:       '#E6EDF3',
  muted:      '#8B949E',
  accent:     '#58A6FF',
  strike:     '#F0B429',
};

/* ─────────────────────────────────────────────────────────────
   TRADE CONFIG  (all self-contained defaults)
───────────────────────────────────────────────────────────── */
const EXPIRY    = new Date(Date.now() + 7 * 86_400_000);
const STRIKE    = 88_000;
const PREMIUM   = 1_200;
const CONTRACTS = 1;
const IV        = 0.62;   // 62% implied vol — realistic for BTC
const R         = 0.05;   // risk-free rate

/* ─────────────────────────────────────────────────────────────
   BLACK-SCHOLES  (client-side approximation)
───────────────────────────────────────────────────────────── */
function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}
const Φ = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
const φ = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

function calcGreeks(S, K = STRIKE, T, σ = IV, r = R) {
  if (T <= 0 || S <= 0) {
    return { Δ: 0, Γ: 0, Θ: 0, ν: 0, price: Math.max(0, S - K) };
  }
  const sq = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * σ * σ) * T) / (σ * sq);
  const d2 = d1 - σ * sq;
  return {
    Δ:     Φ(d1),
    Γ:     φ(d1) / (S * σ * sq),
    Θ:    (-(S * φ(d1) * σ) / (2 * sq) - r * K * Math.exp(-r * T) * Φ(d2)) / 365,
    ν:     S * φ(d1) * sq / 100,
    price: S * Φ(d1) - K * Math.exp(-r * T) * Φ(d2),
  };
}

/* ─────────────────────────────────────────────────────────────
   FORMATTERS
───────────────────────────────────────────────────────────── */
const f$ = (n, d = 0) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const fPct = (n, d = 1) => (n >= 0 ? '+' : '') + n.toFixed(d) + '%';

function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function hhmm(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/* ─────────────────────────────────────────────────────────────
   PAYOFF DATA  (computed once, STRIKE + PREMIUM are constants)
───────────────────────────────────────────────────────────── */
const PAYOFF = (() => {
  const lo = STRIKE * 0.75, hi = STRIKE * 1.25;
  const step = (hi - lo) / 80;
  return Array.from({ length: 81 }, (_, i) => {
    const px  = lo + i * step;
    const pnl = Math.max(0, px - STRIKE) - PREMIUM;
    return { px, pnl };
  });
})();

/* ─────────────────────────────────────────────────────────────
   BINANCE DATA HOOK
   — seeds 30 REST candles, then streams via WebSocket
   — reconnects automatically; cleans up on unmount
───────────────────────────────────────────────────────────── */
function useBTC() {
  const [candles, setCandles] = useState([]);
  const [price,   setPrice]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsLive,  setWsLive]  = useState(false);
  const wsRef   = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // ── REST: seed last 30 1-minute candles ──────────────────
    fetch(
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=30'
    )
      .then((r) => r.json())
      .then((rows) => {
        if (!mounted.current) return;
        const data = rows.map((k) => ({ t: k[0], price: +k[4] }));
        setCandles(data);
        setPrice(data.at(-1)?.price ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (mounted.current) setLoading(false);
      });

    // ── WebSocket: real-time 1m kline ────────────────────────
    function connect() {
      if (!mounted.current) return;
      const ws = new WebSocket(
        'wss://stream.binance.com:9443/ws/btcusdt@kline_1m'
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (mounted.current) setWsLive(true);
      };

      ws.onmessage = (e) => {
        if (!mounted.current) return;
        const { k } = JSON.parse(e.data);
        const candle = { t: k.t, price: +k.c };
        setPrice(+k.c);
        setCandles((prev) => {
          const idx = prev.findIndex((c) => c.t === candle.t);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = candle;
            return next;
          }
          return [...prev.slice(-59), candle];
        });
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        if (mounted.current) {
          setWsLive(false);
          setTimeout(connect, 4000);
        }
      };
    }

    connect();

    return () => {
      mounted.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop
        wsRef.current.close();
      }
    };
  }, []);

  return { candles, price, loading, wsLive };
}

/* ─────────────────────────────────────────────────────────────
   MICRO COMPONENTS
───────────────────────────────────────────────────────────── */

/** Animated green pulse dot — "LIVE" indicator */
function Pulse() {
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

/** Small label badge */
function Tag({ children, color = C.accent }) {
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

/** Compact stat cell */
function Stat({ label, value, color = C.text }) {
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

/** Greek tile with hover tooltip explaining the Greek in plain English */
function GreekCell({ label, value, fmt, tip }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        position: 'relative', cursor: 'default',
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '10px 12px',
        transition: 'border-color 0.15s',
        borderColor: hover ? C.borderHi : C.border,
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
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
            background: C.surfaceAlt, border: `1px solid ${C.borderHi}`,
            borderRadius: 6, padding: '9px 12px',
            fontSize: 12, color: C.muted, lineHeight: 1.55,
            width: 220, zIndex: 50,
            boxShadow: '0 4px 24px rgba(0,0,0,0.65)',
            pointerEvents: 'none',
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

/** Custom tooltip for the price chart */
function PriceTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 4, padding: '5px 10px', fontSize: 12,
      }}
    >
      <div style={{ color: C.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ color: C.accent, fontWeight: 600 }}>
        {f$(payload[0].value)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function BTCTradeIdeaCard() {
  const { candles, price, loading, wsLive } = useBTC();
  const [greeksOpen, setGreeksOpen] = useState(false);
  const [toast,      setToast]      = useState('');
  const [now,        setNow]        = useState(Date.now());
  const toastTimer = useRef(null);

  // Keep countdown fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Derived values
  const msLeft   = EXPIRY - now;
  const daysLeft = msLeft / 86_400_000;
  const T        = daysLeft / 365;
  const S        = price ?? STRIKE * 0.942; // offline fallback ≈ $82.9k

  const g        = useMemo(() => calcGreeks(S, STRIKE, T), [S, T]);
  const pop      = Math.round(g.Δ * 100);
  const dist     = ((STRIKE - S) / S) * 100;   // + = OTM, - = ITM
  const breakeven = STRIKE + PREMIUM;
  const isWarn   = daysLeft < 3;

  // Price chart Y domain with padding
  const prices = candles.map((c) => c.price);
  const yMin   = prices.length ? Math.min(...prices, STRIKE) * 0.997 : STRIKE * 0.95;
  const yMax   = prices.length ? Math.max(...prices, STRIKE) * 1.003 : STRIKE * 1.05;

  const chartData = candles.map((c) => ({ ...c, label: hhmm(c.t) }));

  // Toast helper
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // Share to clipboard
  const share = useCallback(() => {
    const txt =
      `BTC Options Trade Idea\n` +
      `Direction: CALL  |  Strike: ${f$(STRIKE)}\n` +
      `Current: ${f$(S)}  |  Distance: ${fPct(dist)}\n` +
      `Expiry: ${countdown(msLeft)}  |  Premium: ${f$(PREMIUM)}\n` +
      `Breakeven: ${f$(breakeven)}  |  Prob. of Profit: ~${pop}%\n` +
      `IV: ${(IV * 100).toFixed(0)}%`;
    navigator.clipboard
      ?.writeText(txt)
      .then(() => showToast('Idea copied to clipboard'));
  }, [S, msLeft, dist, pop, breakeven, showToast]);

  /* ── render ───────────────────────────────────────────── */
  return (
    <>
      {/* Global keyframes + responsive overrides */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.4); opacity: 0;    }
          100% { transform: scale(2.4); opacity: 0;    }
        }
        @keyframes toast-in {
          from { transform: translate(-50%, 10px); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 640px) {
          .sg4 { grid-template-columns: repeat(2, 1fr) !important; }
          .sg3 { grid-template-columns: 1fr !important; gap: 12px !important; }
          .sg3 .rr-divider { border-left: none !important; border-right: none !important; border-top: 1px solid #21262D !important; padding-top: 12px !important; }
          .btns { flex-direction: column !important; }
          .chart-h { height: 140px !important; }
        }
      `}</style>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            background: C.surfaceAlt,
            border: `1px solid ${C.bullish}44`,
            color: C.text, padding: '10px 20px',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            zIndex: 9999, whiteSpace: 'nowrap',
            boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
            animation: 'toast-in 0.18s ease',
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Page shell */}
      <div
        style={{
          background: C.bg, minHeight: '100vh',
          padding: '32px 16px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Card */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            maxWidth: 680, margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            overflow: 'visible',
          }}
        >

          {/* ══ HEADER ══════════════════════════════════════════ */}
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
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                BTC / USD
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Bitcoin · Deribit Options
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Live pill */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.bullish}12`,
                  border: `1px solid ${C.bullish}28`,
                  padding: '3px 9px', borderRadius: 4,
                }}
              >
                <Pulse />
                <span
                  style={{
                    fontSize: 11, fontWeight: 600,
                    color: C.bullish, letterSpacing: '0.06em',
                  }}
                >
                  LIVE
                </span>
              </div>
              <Tag color={C.muted}>7D</Tag>
              <Tag color={C.bullish}>▲ CALL</Tag>
            </div>
          </div>

          {/* ══ BODY ═════════════════════════════════════════════ */}
          <div style={{ padding: '20px 24px' }}>

            {/* ── Headline + PoP ── */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12, flexWrap: 'wrap',
                }}
              >
                <h2
                  style={{
                    fontSize: 22, fontWeight: 600, color: C.text,
                    lineHeight: 1.3, flex: 1,
                  }}
                >
                  BTC will reach{' '}
                  <span style={{ color: C.strike }}>{f$(STRIKE)}</span>
                  {' '}by{' '}
                  {EXPIRY.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h2>

                {/* Probability of Profit badge */}
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: `${C.accent}18`,
                    border: `1px solid ${C.accent}30`,
                    color: C.accent, borderRadius: 100,
                    padding: '4px 12px', fontSize: 12, fontWeight: 600,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  ~{pop}% PoP
                </span>
              </div>

              <p style={{ marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
                Long {CONTRACTS} BTC call · {f$(PREMIUM)} premium ·{' '}
                {(IV * 100).toFixed(0)}% IV · BSM pricing
              </p>
            </div>

            {/* ── Time Decay Warning (< 3 days to expiry) ── */}
            {isWarn && (
              <div
                style={{
                  background: `${C.strike}0D`,
                  border: `1px solid ${C.strike}38`,
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
            )}

            {/* ── Price Chart ── */}
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8, overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {loading ? (
                /* Loading state */
                <div
                  style={{
                    height: 220, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    color: C.muted, fontSize: 13,
                  }}
                >
                  <Activity size={15} style={{ opacity: 0.4 }} />
                  Fetching live candles…
                </div>
              ) : (
                <>
                  {/* Chart top bar: live price + WS status */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'baseline',
                      justifyContent: 'space-between',
                      padding: '12px 16px 8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span
                        style={{
                          fontSize: 26, fontWeight: 700, color: C.text,
                          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px',
                        }}
                      >
                        {price ? f$(price) : '—'}
                      </span>
                      {price && (
                        <span
                          style={{
                            fontSize: 13, fontWeight: 500,
                            color: dist > 0 ? C.muted : C.bullish,
                          }}
                        >
                          {dist > 0
                            ? `${fPct(dist)} to strike`
                            : `${fPct(Math.abs(dist))} ITM`}
                        </span>
                      )}
                    </div>
                    {!wsLive && price && (
                      <span
                        style={{
                          fontSize: 11, color: C.strike,
                          background: `${C.strike}15`,
                          padding: '2px 6px', borderRadius: 3,
                        }}
                      >
                        reconnecting…
                      </span>
                    )}
                  </div>

                  {/* Recharts price line */}
                  <div className="chart-h" style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 4, right: 68, bottom: 4, left: 0 }}
                      >
                        {/* Shaded region between current price and strike */}
                        {price && (
                          <ReferenceArea
                            y1={Math.min(price, STRIKE)}
                            y2={Math.max(price, STRIKE)}
                            fill={C.accent}
                            fillOpacity={0.04}
                          />
                        )}

                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: C.muted }}
                          tickLine={false}
                          axisLine={{ stroke: C.border }}
                          interval={Math.max(1, Math.floor(chartData.length / 5))}
                        />
                        <YAxis
                          domain={[yMin, yMax]}
                          tick={{ fontSize: 10, fill: C.muted }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => '$' + Math.round(v / 1000) + 'k'}
                          width={46}
                        />
                        <Tooltip content={<PriceTip />} />

                        {/* Strike — dashed amber */}
                        <ReferenceLine
                          y={STRIKE}
                          stroke={C.strike}
                          strokeDasharray="5 3"
                          strokeWidth={1.5}
                          label={{
                            value: `Strike  ${f$(STRIKE)}`,
                            position: 'right',
                            fill: C.strike, fontSize: 10, fontWeight: 600,
                            offset: 8,
                          }}
                        />

                        {/* Current price — dashed blue */}
                        {price && (
                          <ReferenceLine
                            y={price}
                            stroke={C.accent}
                            strokeDasharray="2 3"
                            strokeWidth={1}
                            label={{
                              value: f$(price),
                              position: 'right',
                              fill: C.accent, fontSize: 10,
                              offset: 8,
                            }}
                          />
                        )}

                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={C.accent}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 4, fill: C.accent,
                            stroke: C.surface, strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>

            {/* ── Stats Row ── */}
            <div
              className="sg4"
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8, marginBottom: 16,
              }}
            >
              <Stat label="Current"  value={price ? f$(price) : '—'} />
              <Stat label="Strike"   value={f$(STRIKE)}        color={C.strike} />
              <Stat label="Expiry"   value={countdown(msLeft)} />
              <Stat
                label="Distance"
                value={price ? fPct(dist) : '—'}
                color={dist > 0 ? C.accent : C.bullish}
              />
            </div>

            {/* ── IV Indicator ── */}
            <div
              style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '12px 16px', marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 10,
                }}
              >
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                    Implied Volatility
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>
                    30D range
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 22, fontWeight: 700, color: C.accent,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {(IV * 100).toFixed(0)}%
                  </span>
                  <Tag color={C.strike}>MID</Tag>
                </div>
              </div>

              {/* Range bar: low 30% → high 120% */}
              <div style={{ position: 'relative', height: 6, borderRadius: 3 }}>
                {/* Gradient track */}
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 3,
                    background: `linear-gradient(to right, ${C.bullish}55, ${C.strike}55, ${C.bearish}55)`,
                  }}
                />
                {/* Current IV marker */}
                {(() => {
                  const pct = Math.min(
                    Math.max(((IV - 0.3) / (1.2 - 0.3)) * 100, 2),
                    98
                  );
                  return (
                    <div
                      style={{
                        position: 'absolute', top: '50%',
                        left: `${pct}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 12, height: 12, borderRadius: '50%',
                        background: C.accent,
                        border: `2px solid ${C.bg}`,
                        boxShadow: `0 0 0 3px ${C.accent}30`,
                      }}
                    />
                  );
                })()}
              </div>

              <div
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 6, fontSize: 10, color: C.muted,
                }}
              >
                <span>30% Low</span>
                <span>75% Mid</span>
                <span>120% High</span>
              </div>
            </div>

            {/* ── Risk / Reward ── */}
            <div
              style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '12px 16px', marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12,
                }}
              >
                Risk / Reward
              </div>
              <div
                className="sg3"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
                {/* Max Loss */}
                <div style={{ textAlign: 'center', paddingRight: 12 }}>
                  <div
                    style={{
                      fontSize: 10, color: C.muted, marginBottom: 3,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    Max Loss
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.bearish }}>
                    {f$(PREMIUM * CONTRACTS)}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    premium paid
                  </div>
                </div>

                {/* Breakeven */}
                <div
                  className="rr-divider"
                  style={{
                    textAlign: 'center',
                    borderLeft: `1px solid ${C.border}`,
                    borderRight: `1px solid ${C.border}`,
                    paddingLeft: 12, paddingRight: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10, color: C.muted, marginBottom: 3,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    Breakeven
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.strike }}>
                    {f$(breakeven)}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    at expiry
                  </div>
                </div>

                {/* Max Gain */}
                <div style={{ textAlign: 'center', paddingLeft: 12 }}>
                  <div
                    style={{
                      fontSize: 10, color: C.muted, marginBottom: 3,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    Max Gain
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.bullish }}>
                    Uncapped
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    long call
                  </div>
                </div>
              </div>
            </div>

            {/* ── Greeks Panel (collapsible) ── */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setGreeksOpen((o) => !o)}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%', background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '9px 14px',
                  cursor: 'pointer', color: C.muted,
                  fontSize: 13, fontWeight: 500,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.borderHi;
                  e.currentTarget.style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.muted;
                }}
              >
                <span>Greeks</span>
                {greeksOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {greeksOpen && (
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: 8, marginTop: 8,
                  }}
                >
                  <GreekCell
                    label="Delta (Δ)"
                    value={g.Δ}
                    tip="How much the option price moves per $1 BTC move. Δ = 0.45 → earns ~$0.45 for every $1 BTC rises. Also a rough proxy for probability of expiring ITM."
                  />
                  <GreekCell
                    label="Gamma (Γ)"
                    value={g.Γ}
                    fmt={(v) => v.toExponential(3)}
                    tip="Rate of change of delta per $1 BTC move. High gamma near expiry means your delta (and risk) shifts rapidly — cuts both ways."
                  />
                  <GreekCell
                    label="Theta (Θ)"
                    value={g.Θ}
                    fmt={(v) => f$(v, 2) + '/day'}
                    tip="Daily time decay cost. You lose this dollar amount every day the option is held, all else equal. Accelerates sharply in the last 30 days."
                  />
                  <GreekCell
                    label="Vega (ν)"
                    value={g.ν}
                    fmt={(v) => f$(v, 2) + ' / 1%IV'}
                    tip="Sensitivity to implied volatility. A vega of $200 means a 1% spike in IV adds ~$200 to the option's mark. Long options benefit from IV expansion."
                  />
                </div>
              )}
            </div>

            {/* ── Payoff at Expiry ── */}
            <div
              style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '12px 16px', marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  P&amp;L at Expiry
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  Breakeven:{' '}
                  <span style={{ color: C.accent, fontWeight: 600 }}>
                    {f$(breakeven)}
                  </span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={120}>
                <AreaChart
                  data={PAYOFF}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.bullish} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.bullish} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  {/* Loss zone highlight */}
                  <ReferenceArea
                    y1={-PREMIUM * 1.15}
                    y2={0}
                    fill={C.bearish}
                    fillOpacity={0.07}
                  />

                  <XAxis
                    dataKey="px"
                    tickFormatter={(v) => '$' + Math.round(v / 1000) + 'k'}
                    tick={{ fontSize: 9, fill: C.muted }}
                    tickLine={false}
                    axisLine={{ stroke: C.border }}
                    interval={16}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      (v >= 0 ? '+' : '') + Math.round(v / 1000) + 'k'
                    }
                    tick={{ fontSize: 9, fill: C.muted }}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                  />
                  <Tooltip
                    formatter={(v) => [f$(v), 'P&L']}
                    labelFormatter={(v) => 'BTC ' + f$(v)}
                    contentStyle={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4, fontSize: 11,
                    }}
                    labelStyle={{ color: C.muted }}
                    itemStyle={{ color: C.text }}
                  />

                  {/* Zero line */}
                  <ReferenceLine y={0} stroke={C.border} strokeWidth={1} />

                  {/* Breakeven vertical */}
                  <ReferenceLine
                    x={breakeven}
                    stroke={C.accent}
                    strokeDasharray="3 2"
                    strokeWidth={1}
                    label={{
                      value: 'BE', position: 'top',
                      fill: C.accent, fontSize: 9,
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke={C.bullish}
                    strokeWidth={2}
                    fill="url(#profitGrad)"
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{ r: 3, fill: C.bullish, stroke: C.surface }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ── Action Footer ── */}
            <div className="btns" style={{ display: 'flex', gap: 8 }}>
              {/* Trade on Deribit */}
              <a
                href="https://www.deribit.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  background: C.accent, color: '#0D1117',
                  borderRadius: 6, padding: '11px 16px',
                  fontSize: 13, fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Trade on Deribit
                <ExternalLink size={13} />
              </a>

              {/* Share Idea */}
              <button
                onClick={share}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.text, borderRadius: 6,
                  padding: '11px 16px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
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
                <Share2 size={13} />
                Share Idea
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
