import { useState, useEffect, useRef, Fragment } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
  ReferenceArea, Customized,
} from 'recharts';
import { Activity } from 'lucide-react';
import { C, TRADE } from '../../design/tokens';
import { f$, fPct, hhmm } from '../../lib/fmt';

/* ─────────────────────────────────────────────────────────────
   CANDLESTICK LAYER
   Rendered via <Customized> so it has direct access to the
   chart's D3 scale functions — the only reliable way to draw
   OHLC wicks that extend outside a Bar's y/height bounds.
───────────────────────────────────────────────────────────── */
function CandlestickLayer({ xAxisMap, yAxisMap, data, offset }) {
  const yAxis = yAxisMap?.[0];
  const xAxis = xAxisMap?.[0];
  if (!yAxis?.scale || !xAxis?.scale || !data?.length) return null;

  const yScale = yAxis.scale;
  const xScale = xAxis.scale;
  // bandwidth() exists on D3 band scales (categorical XAxis)
  const bw = typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 10;

  const ox = offset?.left ?? 0;
  const oy = offset?.top  ?? 0;

  return (
    <g>
      {data.map((d) => {
        if (d.high == null || d.open == null) return null;

        // pixel coordinates — xScale gives left edge of band
        const cx   = ox + (xScale(d.label) ?? 0) + bw / 2;
        const yHi  = oy + yScale(d.high);
        const yLo  = oy + yScale(d.low);
        const yOp  = oy + yScale(d.open);
        const yCl  = oy + yScale(d.close);

        const isUp     = d.close >= d.open;
        const color    = isUp ? C.bullish : C.bearish;
        const bodyTop  = Math.min(yOp, yCl);
        const bodyH    = Math.max(Math.abs(yCl - yOp), 1.5); // min 1.5px so doji is visible
        const bodyW    = Math.max(bw * 0.62, 3);

        return (
          <g key={d.t}>
            {/* Full wick — high to low */}
            <line
              x1={cx} y1={yHi}
              x2={cx} y2={yLo}
              stroke={color}
              strokeWidth={1}
              opacity={0.55}
            />
            {/* Candle body */}
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
              fillOpacity={isUp ? 0.45 : 0.82}
              stroke={color}
              strokeWidth={1}
              rx={0.5}
            />
          </g>
        );
      })}
    </g>
  );
}

/* ─────────────────────────────────────────────────────────────
   TOOLTIPS
───────────────────────────────────────────────────────────── */
function LineTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={tipBox}>
      <div style={tipLabel}>{label}</div>
      <div style={{ color: C.accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {f$(v)}
      </div>
    </div>
  );
}

function CandleTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (d?.high == null) return null;
  const isUp = d.close >= d.open;
  const chg  = ((d.close - d.open) / d.open) * 100;

  return (
    <div style={{ ...tipBox, minWidth: 148 }}>
      <div style={{ ...tipLabel, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 14px' }}>
        {[
          ['O', f$(d.open),  C.text],
          ['H', f$(d.high),  C.bullish],
          ['L', f$(d.low),   C.bearish],
          ['C', f$(d.close), isUp ? C.bullish : C.bearish],
        ].map(([lbl, val, col]) => (
          <Fragment key={lbl}>
            <span style={{ color: C.muted, fontSize: 10 }}>{lbl}</span>
            <span style={{ color: col, fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
              {val}
            </span>
          </Fragment>
        ))}
      </div>
      <div style={{
        marginTop: 6, paddingTop: 6,
        borderTop: `1px solid ${C.border}`,
        fontSize: 11, fontWeight: 600,
        color: isUp ? C.bullish : C.bearish,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fPct(chg)} on candle
      </div>
    </div>
  );
}

const tipBox   = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 11px', fontSize: 12 };
const tipLabel = { color: C.muted, marginBottom: 2, fontSize: 11 };

/* ─────────────────────────────────────────────────────────────
   MODE TOGGLE
───────────────────────────────────────────────────────────── */
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 4, overflow: 'hidden',
    }}>
      {['LINE', 'CANDLE'].map((m) => {
        const active = mode === m.toLowerCase();
        return (
          <button
            key={m}
            onClick={() => onChange(m.toLowerCase())}
            style={{
              padding: '3px 10px',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
              cursor: 'pointer', border: 'none',
              background: active ? C.accent : 'transparent',
              color: active ? '#ffffff' : C.muted,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export function PriceChart({ candles, price, loading, wsLive }) {
  const [mode,  setMode]  = useState('candle');
  const [flash, setFlash] = useState(null); // 'up' | 'down' | null
  const prevPrice = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => {
    if (price == null) return;
    if (prevPrice.current != null && price !== prevPrice.current) {
      const dir = price > prevPrice.current ? 'up' : 'down';
      setFlash(dir);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 420);
    }
    prevPrice.current = price;
  }, [price]);

  // Attach label for XAxis categorical key
  const chartData = candles.map((c) => ({ ...c, label: hhmm(c.t) }));

  // Domain uses full OHLC range so wicks don't clip
  const highs = candles.map((c) => c.high  ?? c.close);
  const lows  = candles.map((c) => c.low   ?? c.close);
  const yMin  = lows.length  ? Math.min(...lows,  TRADE.strike) * 0.9975 : TRADE.strike * 0.95;
  const yMax  = highs.length ? Math.max(...highs, TRADE.strike) * 1.0025 : TRADE.strike * 1.05;

  // Derived display values
  const dist        = price != null ? ((TRADE.strike - price) / price) * 100 : null;
  const firstClose  = candles[0]?.close;
  const sessionChg  = price != null && firstClose ? ((price - firstClose) / firstClose) * 100 : null;

  const xInterval = Math.max(1, Math.floor(chartData.length / 5));

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 8, overflow: 'hidden',
      marginBottom: 16,
    }}>
      {loading ? (
        /* ── Loading ── */
        <div style={{
          height: 240, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          color: C.muted, fontSize: 13,
        }}>
          <Activity size={15} style={{ opacity: 0.4 }} />
          Fetching live candles…
        </div>
      ) : (
        <>
          {/* ── Chart header ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '12px 16px 8px', gap: 8,
          }}>
            {/* Price cluster */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 26, fontWeight: 700,
                  color: flash === 'up' ? C.bullish : flash === 'down' ? C.bearish : C.text,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px',
                  lineHeight: 1,
                  transition: 'color 0.35s ease',
                }}>
                  {price != null ? f$(price) : '—'}
                </span>

                {sessionChg != null && (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: sessionChg >= 0 ? C.bullish : C.bearish,
                  }}>
                    {fPct(sessionChg)}
                  </span>
                )}
              </div>

              {/* Distance to strike — secondary line */}
              {dist != null && (
                <div style={{ marginTop: 3, fontSize: 12, color: C.muted }}>
                  {dist > 0
                    ? <><span style={{ color: C.strike }}>↑</span> {fPct(dist)} to <span style={{ color: C.strike }}>{f$(TRADE.strike)}</span> strike</>
                    : <><span style={{ color: C.bullish }}>✓</span> <span style={{ color: C.bullish }}>{Math.abs(dist).toFixed(1)}% ITM</span></>
                  }
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {!wsLive && price != null && (
                <span style={{
                  fontSize: 10, color: C.strike,
                  background: `${C.strike}15`,
                  padding: '2px 6px', borderRadius: 3,
                }}>
                  reconnecting…
                </span>
              )}
              <ModeToggle mode={mode} onChange={setMode} />
            </div>
          </div>

          {/* ── Chart ── */}
          <div className="chart-h" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 72, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke={C.border}
                  strokeOpacity={0.5}
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: C.muted }}
                  tickLine={false}
                  axisLine={{ stroke: C.border }}
                  interval={xInterval}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 10, fill: C.muted }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => '$' + Math.round(v / 1000) + 'k'}
                  width={46}
                />

                <Tooltip
                  content={mode === 'line' ? <LineTip /> : <CandleTip />}
                  cursor={{ stroke: C.borderHi, strokeWidth: 1, strokeDasharray: '3 2' }}
                />

                {/* Shaded gap — current price ↔ strike (visual distance to target) */}
                {price != null && (
                  <ReferenceArea
                    y1={Math.min(price, TRADE.strike)}
                    y2={Math.max(price, TRADE.strike)}
                    fill={C.strike}
                    fillOpacity={0.04}
                  />
                )}

                {/* Strike — amber dashed (classic trading terminal convention) */}
                <ReferenceLine
                  y={TRADE.strike}
                  stroke={C.strike}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `⬤ ${f$(TRADE.strike)}`,
                    position: 'right',
                    fill: C.strike,
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 8,
                  }}
                />

                {/* Live price — blue dashed */}
                {price != null && (
                  <ReferenceLine
                    y={price}
                    stroke={C.accent}
                    strokeDasharray="2 3"
                    strokeWidth={1}
                    label={{
                      value: f$(price),
                      position: 'right',
                      fill: C.accent,
                      fontSize: 10,
                      offset: 8,
                    }}
                  />
                )}

                {/* ── LINE MODE ── */}
                {mode === 'line' && (
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={C.accent}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: C.accent, stroke: C.surface, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}

                {/* ── CANDLE MODE ── */}
                {mode === 'candle' && (
                  <>
                    {/*
                      Invisible line — binds `close` values to the chart so
                      Recharts computes the correct YAxis scale before
                      CandlestickLayer reads it via Customized.
                    */}
                    <Line
                      dataKey="close"
                      stroke="transparent"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                      legendType="none"
                    />
                    {/*
                      CandlestickLayer receives xAxisMap / yAxisMap / data / offset
                      from Recharts internals and draws pure SVG candles.
                    */}
                    <Customized component={CandlestickLayer} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── Bottom strip: candle count + last update ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 16px 8px',
            fontSize: 10, color: C.muted,
          }}>
            <span>{chartData.length} × 1m candles</span>
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: wsLive ? C.bullish : C.muted,
              }}
            >
              <span style={{
                display: 'inline-block', width: 5, height: 5,
                borderRadius: '50%',
                background: wsLive ? C.bullish : C.muted,
              }} />
              {wsLive ? 'Binance WS · live' : 'Binance WS · offline'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
