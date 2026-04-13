# BTC Options Trade Idea Card — Architecture & Product Documentation

> Stack: React 18 · Vite 5 · Recharts · Lucide · Binance WS · Deribit WS

---

## 1. Business Context

### What this is

A real-time options trade idea card that presents a single BTC call option trade as a clear, human-readable product UI. The card communicates the trade thesis — _"BTC will reach $88,000 by Apr 20"_ — and backs it with live market data, risk metrics, and a price chart.

### Who it's for

A retail or semi-professional investor who understands the concept of buying a call option but does not want to read a raw options chain. The card translates trading parameters into plain English and visual context.

### Business value

- **Reduces cognitive load** — one glance tells the user the direction, target, timeframe, and cost
- **Builds trust** — prices update in real time via WebSocket; no stale screenshots
- **Risk transparency** — breakeven, max loss, and P&L scenarios are computed and displayed automatically
- **Dual-theme** — dark (trading terminal default) and light (daytime / mobile) with a single toggle
- **Institutional credibility** — live Deribit IV and exchange-computed Greeks signal this is a real trading product, not a toy

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  Binance WS │   │  Deribit WS  │   │  Binance REST    │  │
│  │  kline_1m   │   │  ticker.C.raw│   │  /klines seed    │  │
│  └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘  │
│         │                 │                    │             │
│  ┌──────▼──────┐   ┌──────▼───────┐            │             │
│  │  useBTC()   │   │ useDeribit() │◄───────────┘             │
│  │  candles[]  │   │  iv, greeks  │                          │
│  │  price      │   │  markUSD     │                          │
│  │  wsLive     │   │  bid, ask    │                          │
│  └──────┬──────┘   └──────┬───────┘                          │
│         └────────┬─────────┘                                  │
│                  │                                            │
│         ┌────────▼────────┐                                   │
│         │ TradeCard/index │  ← composition root               │
│         │ live-first merge│  iv = liveIV ?? TRADE.iv          │
│         │ BSM fallback    │  greeks = liveGreeks ?? bsmCalc   │
│         └────────┬────────┘                                   │
│                  │ props                                       │
│    ┌─────────────┼──────────────────────────┐                │
│    │             │                          │                │
│  Header    PriceChart                 GreeksPanel            │
│  Headline  StatsRow                   IVIndicator            │
│  DecayWarn RiskReward                 PayoffChart            │
│            ReturnScenarios            ActionFooter           │
└─────────────────────────────────────────────────────────────┘
```

### Data flow

1. **REST seed** (`useBTC`): On mount, fetches the last 30 1-minute OHLC candles from Binance REST API. Provides immediate chart population before the WebSocket connects.
2. **Binance WebSocket** (`useBTC`): Streams `btcusdt@kline_1m`. Each message upserts the current candle (same timestamp) or appends a new one (new minute), keeping a rolling 60-candle window. Price is always the latest close.
3. **Deribit WebSocket** (`useDeribit`): Subscribes to `ticker.BTC-DDMMMYY-STRIKE-C.raw`. Delivers live IV (`mark_iv`), mark price in BTC (converted to USD via `index_price`), bid/ask, and exchange-computed Greeks. Responds to `public/heartbeat` to prevent disconnection.
4. **Live-first merge** (`index.jsx`): The composition root applies a priority chain — exchange data wins, config constants are the fallback. The card is always functional even when Deribit is unreachable.
5. **BSM fallback** (`bsm.js`): If Deribit Greeks are unavailable, `calcGreeks(S, K, T, σ, r)` computes Δ, Γ, Θ, ν from Black-Scholes using the Abramowitz & Stegun erf approximation.

---

## 3. Code Design

### Layer model

```
src/
├── design/
│   └── tokens.js          ← color system (CSS vars + resolved palettes), TRADE config
├── lib/
│   ├── bsm.js             ← pure math: Black-Scholes Greeks
│   ├── fmt.js             ← pure formatters: f$(), fPct(), countdown(), hhmm()
│   ├── instrument.js      ← derives Deribit instrument string from TRADE.expiry
│   └── payoff.js          ← buildPayoff(premium) — live P&L curve, 81 points
├── hooks/
│   ├── useBTC.js          ← Binance REST + WS → { candles, price, loading, wsLive }
│   ├── useDeribit.js      ← Deribit WS → { iv, markUSD, liveGreeks, bid, ask, connected }
│   └── useTheme.js        ← theme toggle → [palette, toggle, theme]
└── components/
    ├── ui/                ← stateless atoms: Tag, Stat, Pulse, GreekCell
    └── TradeCard/
        ├── index.jsx      ← ONLY file that calls hooks and owns derived state
        ├── Header.jsx     ← instrument name + LIVE/CONNECTING badge
        ├── Headline.jsx   ← human-readable trade thesis + PoP badge
        ├── DecayWarning.jsx
        ├── PriceChart.jsx ← OHLC candlestick + line mode + price flash on tick
        ├── StatsRow.jsx   ← 4-stat grid + optional live bid/ask row
        ├── RiskReward.jsx ← max loss / breakeven / max gain
        ├── ReturnScenarios.jsx ← 4 P&L scenarios with progress bars
        ├── IVIndicator.jsx
        ├── GreeksPanel.jsx
        ├── PayoffChart.jsx
        └── ActionFooter.jsx
```

### Key architectural decisions

**CSS custom properties for theming**  
All color tokens are CSS var references (`var(--c-bg)`). Both themes are defined as CSS var blocks injected once via `<style>`. Flipping `data-theme` on `<html>` instantly swaps every color across all 14 components — no prop drilling, no context, no extra re-renders. `useTheme()` returns a resolved hex palette only for the rare cases where CSS vars can't be used at paint time (SVG `<linearGradient stopColor>`).

**`<Customized>` for candlesticks**  
Recharts has no native candlestick type. `<Bar>` cannot draw wicks that extend outside its `y/height` bounds. The solution: `<Customized component={CandlestickLayer}>` receives Recharts' internal `xAxisMap` and `yAxisMap` (D3 scale functions), enabling pixel-exact SVG rendering. A hidden transparent `<Line dataKey="close">` forces Recharts to compute axis scales before `Customized` reads them.

**Single composition root**  
`TradeCard/index.jsx` is the only file that calls `useBTC()` and `useDeribit()`. All child components are pure-presentational — they receive props and render. Data flow is traceable in one place; each component is independently testable.

**WebSocket reconnect pattern**  
Both hooks implement auto-reconnect via `setTimeout(connect, 4000)` in `ws.onclose`. On intentional unmount, `ws.onclose = null` is set before `ws.close()` to prevent the reconnect loop from firing after the component is gone.

**Live payoff curve**  
`buildPayoff(premium)` is called with the live mark price and memoized via `useMemo`. The P&L chart and loss zone update whenever Deribit pushes a new mark price — not baked in at module load time.

---

## 4. Component Reference

| Component         | Props                              | Responsibility                                              |
| ----------------- | ---------------------------------- | ----------------------------------------------------------- |
| `Header`          | `instrument, deribitLive`          | Asset identity, animated LIVE/CONNECTING badge              |
| `Headline`        | `pop, iv, ivLive, premium`         | Human trade thesis, PoP badge, data source label            |
| `DecayWarning`    | —                                  | Amber strip when < 3 days to expiry                         |
| `PriceChart`      | `candles, price, loading, wsLive`  | Candlestick/line chart, price flash on tick, WS status dot  |
| `StatsRow`        | `price, msLeft, premium, bid, ask` | 4-stat grid + optional live bid/ask/spread row              |
| `RiskReward`      | `breakeven, premium`               | Max loss / breakeven / max gain — 3-col grid                |
| `ReturnScenarios` | `price, premium`                   | 4 price targets with move %, P&L, return %, progress bars   |
| `IVIndicator`     | `iv, live`                         | IV value + LOW/MID/HIGH range bar with animated marker      |
| `GreeksPanel`     | `g, source`                        | Collapsible Δ Γ Θ ν tiles with plain-English hover tooltips |
| `PayoffChart`     | `breakeven, premium`               | P&L at expiry area chart, reactive to live premium          |
| `ActionFooter`    | `onShare`                          | "Trade on Deribit" CTA + clipboard share button             |

---

## 5. Real-Time Update Cadence

| Signal       | Source        | Frequency                | What updates                                         |
| ------------ | ------------- | ------------------------ | ---------------------------------------------------- |
| BTC price    | Binance WS    | ~1s (per trade)          | Price display, candle close, chart, flash animation  |
| OHLC candle  | Binance WS    | Every 1-min boundary     | New candle appended, 60-candle window slides         |
| IV & Greeks  | Deribit WS    | ~1s                      | `iv`, `liveGreeks`, `markUSD`, bid/ask, payoff curve |
| Countdown    | `setInterval` | Every 15s                | Expiry countdown in StatsRow                         |
| BSM fallback | Derived       | On every price/IV change | Greeks computed locally when Deribit is offline      |

---

## 6. Theme System

Tokens in `src/design/tokens.js` define two plain hex palettes (`DARK`, `LIGHT`) and `buildThemeCSS()` which emits:

```css
:root                { --c-bg: #0D1117; --c-surface: #161B22; … }
[data-theme="light"] { --c-bg: #EEF1F5; --c-surface: #FFFFFF; … }
```

| Token        | Dark      | Light     | Purpose                      |
| ------------ | --------- | --------- | ---------------------------- |
| `bg`         | `#0D1117` | `#EEF1F5` | Page background              |
| `surface`    | `#161B22` | `#FFFFFF` | Card background              |
| `surfaceAlt` | `#1C2128` | `#F3F6F9` | Raised panels, stat cells    |
| `border`     | `#21262D` | `#D8DEE4` | All borders                  |
| `text`       | `#E6EDF3` | `#1C2128` | Primary text                 |
| `muted`      | `#8B949E` | `#5E6B7A` | Labels, secondary text       |
| `accent`     | `#58A6FF` | `#0969DA` | Price, links, active states  |
| `bullish`    | `#3FB950` | `#1A7F37` | Profit, up moves             |
| `bearish`    | `#F85149` | `#C92A2A` | Loss, down moves             |
| `strike`     | `#F0B429` | `#7D5800` | Strike price, amber warnings |

The toggle button (`🌙 Dark / ☀️ Light`) is `position:fixed` so it's accessible during scroll on both desktop and mobile.

---

## 7. Responsive Breakpoints

| Breakpoint | Change                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `≤ 640px`  | Card padding → 16px; stats grid → 2-col; chart → 180px tall; RR dividers stack with border-top; CTA buttons stack vertically |
| `≤ 380px`  | Chart → 155px tall                                                                                                           |
| All sizes  | Theme toggle fixed top-right, never overlaps card                                                                            |

---

## 8. Deployment

`vercel.json` at project root:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Ensures Vercel serves `index.html` for all routes (SPA client-side routing).

```bash
npm run build
vercel deploy --prod
```

---

## 9. AI Tools Used

- **Claude (Anthropic)** — primary implementation: architecture, all component code, hooks, Black-Scholes math, WebSocket integration, iterative review and refactoring
- **Vite** — build tooling and dev server
- **Recharts** — charting library, extended with a custom SVG candlestick layer via `<Customized>`
- **Google Stitch** — UI/UX Design

---
