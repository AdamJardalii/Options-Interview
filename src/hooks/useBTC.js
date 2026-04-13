import { useState, useEffect, useRef } from 'react';

/**
 * Fetches 30 OHLC candles via REST, then streams 1-minute klines via WebSocket.
 * Candle shape: { t, open, high, low, close }
 * `price` is always the latest close.
 *
 * @returns {{ candles: {t:number,open:number,high:number,low:number,close:number}[], price: number|null, loading: boolean, wsLive: boolean }}
 */
export function useBTC() {
  const [candles, setCandles] = useState([]);
  const [price,   setPrice]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsLive,  setWsLive]  = useState(false);
  const wsRef   = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // ── REST seed: full OHLC ────────────────────────────────
    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=30')
      .then((r) => r.json())
      .then((rows) => {
        if (!mounted.current) return;
        const data = rows.map((k) => ({
          t:     k[0],
          open:  +k[1],
          high:  +k[2],
          low:   +k[3],
          close: +k[4],
        }));
        setCandles(data);
        setPrice(data.at(-1)?.close ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (mounted.current) setLoading(false);
      });

    // ── WebSocket: live OHLC updates ────────────────────────
    function connect() {
      if (!mounted.current) return;
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
      wsRef.current = ws;

      ws.onopen  = () => { if (mounted.current) setWsLive(true); };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (mounted.current) {
          setWsLive(false);
          setTimeout(connect, 4000);
        }
      };

      ws.onmessage = (e) => {
        if (!mounted.current) return;
        const { k } = JSON.parse(e.data);
        const candle = {
          t:     k.t,
          open:  +k.o,
          high:  +k.h,
          low:   +k.l,
          close: +k.c,
        };
        setPrice(+k.c);
        setCandles((prev) => {
          const idx = prev.findIndex((c) => c.t === candle.t);
          if (idx >= 0) {
            // same minute — update in-place (high/low may have widened)
            const next = [...prev];
            next[idx] = candle;
            return next;
          }
          // new candle — slide window, keep max 60
          return [...prev.slice(-59), candle];
        });
      };
    }

    connect();

    return () => {
      mounted.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return { candles, price, loading, wsLive };
}
