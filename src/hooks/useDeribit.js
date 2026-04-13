import { useState, useEffect, useRef } from 'react';

/**
 * Subscribes to a Deribit public ticker channel for a single option instrument.
 * No API key required — Deribit's ticker feed is fully public.
 *
 * Returns:
 *   iv         — mark implied volatility as a decimal (e.g. 0.625 for 62.5%)
 *   markUSD    — mark price in USD  (mark_price_BTC * index_price)
 *   liveGreeks — { Δ, Γ, Θ, ν } exchange-computed, USD-denominated
 *   bid / ask  — best bid / ask in USD
 *   spread     — ask - bid in USD
 *   connected  — WebSocket is open and subscribed
 *
 * All fields are null until the first ticker message arrives.
 * Falls back gracefully if the instrument name is wrong or Deribit is unreachable.
 */
export function useDeribit(instrument) {
  const [state, setState] = useState({
    iv:          null,
    markUSD:     null,
    liveGreeks:  null,
    bid:         null,
    ask:         null,
    spread:      null,
  });
  const [connected, setConnected] = useState(false);

  const wsRef   = useRef(null);
  const mounted = useRef(true);
  const msgId   = useRef(1);

  useEffect(() => {
    mounted.current = true;

    function send(ws, payload) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: msgId.current++, ...payload }));
      }
    }

    function connect() {
      if (!mounted.current) return;

      const ws = new WebSocket('wss://www.deribit.com/ws/api/v2');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted.current) return;
        // Subscribe to the raw ticker channel — updates on every book change
        send(ws, {
          method: 'public/subscribe',
          params: { channels: [`ticker.${instrument}.raw`] },
        });
        setConnected(true);
      };

      ws.onmessage = (e) => {
        if (!mounted.current) return;
        const msg = JSON.parse(e.data);

        // Deribit requires heartbeat responses to keep the connection alive
        if (msg.method === 'public/heartbeat') {
          send(ws, { method: 'public/test', params: {} });
          return;
        }

        // Ticker update
        if (msg.method === 'subscription') {
          const d = msg.params?.data;
          if (!d) return;

          const index  = d.index_price;              // BTC spot in USD
          const toUSD  = (btc) => (btc != null && index != null ? btc * index : null);

          const bid    = toUSD(d.best_bid_price);
          const ask    = toUSD(d.best_ask_price);

          setState({
            iv:        d.mark_iv   != null ? d.mark_iv / 100 : null,   // % → decimal
            markUSD:   toUSD(d.mark_price),
            liveGreeks: d.greeks ? {
              Δ: d.greeks.delta,   // dimensionless, 0–1 for calls
              Γ: d.greeks.gamma,   // Δ change per $1 BTC move
              Θ: d.greeks.theta,   // USD/day (already negative for long)
              ν: d.greeks.vega,    // USD per 1% IV move
            } : null,
            bid,
            ask,
            spread: bid != null && ask != null ? ask - bid : null,
          });
        }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        if (mounted.current) {
          setConnected(false);
          setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      mounted.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null; // stop reconnect loop
        wsRef.current.close();
      }
    };
  }, [instrument]); // re-subscribe if instrument name changes

  return { ...state, connected };
}
