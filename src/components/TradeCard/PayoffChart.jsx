import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, ReferenceArea,
} from 'recharts';
import { C, TRADE } from '../../design/tokens';
import { useTheme } from '../../hooks/useTheme';
import { f$ } from '../../lib/fmt';
import { buildPayoff } from '../../lib/payoff';

/** @param {{ breakeven: number, premium: number }} props */
export function PayoffChart({ breakeven, premium }) {
  const [palette] = useTheme();
  const payoff = useMemo(() => buildPayoff(premium), [premium]);

  return (
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
          <span style={{ color: C.accent, fontWeight: 600 }}>{f$(breakeven)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={payoff} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={palette.bullish} stopOpacity={0.35} />
              <stop offset="95%" stopColor={palette.bullish} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Red wash for the loss zone — sized to live premium */}
          <ReferenceArea
            y1={-premium * 1.15}
            y2={0}
            fill={palette.bearish}
            fillOpacity={0.07}
          />

          <XAxis
            dataKey="px"
            tickFormatter={(v) => '$' + Math.round(v / 1000) + 'k'}
            tick={{ fontSize: 9, fill: palette.muted }}
            tickLine={false}
            axisLine={{ stroke: palette.border }}
            interval={16}
          />
          <YAxis
            tickFormatter={(v) => (v >= 0 ? '+' : '') + Math.round(v / 1000) + 'k'}
            tick={{ fontSize: 9, fill: palette.muted }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip
            formatter={(v) => [f$(v), 'P&L']}
            labelFormatter={(v) => 'BTC ' + f$(v)}
            contentStyle={{
              background: palette.surface, border: `1px solid ${palette.border}`,
              borderRadius: 4, fontSize: 11,
            }}
            labelStyle={{ color: palette.muted }}
            itemStyle={{ color: palette.text }}
          />

          <ReferenceLine y={0} stroke={palette.border} strokeWidth={1} />
          <ReferenceLine
            x={breakeven}
            stroke={palette.accent}
            strokeDasharray="3 2"
            strokeWidth={1}
            label={{ value: 'BE', position: 'top', fill: palette.accent, fontSize: 9 }}
          />

          <Area
            type="monotone"
            dataKey="pnl"
            stroke={palette.bullish}
            strokeWidth={2}
            fill="url(#profitGrad)"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 3, fill: palette.bullish, stroke: palette.surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
