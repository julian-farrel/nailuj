"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { Activity, Wifi, WifiOff, ChevronDown } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────
const HL_WS_URL   = "wss://api.hyperliquid.xyz/ws";
const BOOK_LEVELS = 15;

const COINS = [
  { label: "BTC", coin: "BTC" },
  { label: "ETH", coin: "ETH" },
  { label: "SOL", coin: "SOL" },
  { label: "ARB", coin: "ARB" },
  { label: "AVAX", coin: "AVAX" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtPrice(p) {
  if (!p) return "—";
  const n = parseFloat(p);
  if (n >= 1000)  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (n >= 1)     return n.toFixed(3);
  return n.toFixed(6);
}

function fmtSize(s) {
  const n = parseFloat(s);
  if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
  return n.toFixed(3);
}

// ── Orderbook side component ───────────────────────────────────────────────
function BookSide({ levels, side, maxSize }) {
  const isAsk  = side === "ask";
  const color  = isAsk ? "#f87171" : "#4ade80";
  const bgBase = isAsk ? "rgba(248,113,113," : "rgba(74,222,128,";

  return (
    <div className={`flex flex-col ${isAsk ? "justify-end" : "justify-start"} gap-px`}>
      {levels.map(([px, sz], i) => {
        const pct = maxSize > 0 ? (parseFloat(sz) / maxSize) : 0;
        return (
          <div
            key={`${side}-${i}`}
            className="relative flex items-center justify-between px-2 h-[22px] overflow-hidden select-none group"
          >
            {/* Depth bar behind */}
            <div
              className="absolute inset-y-0 right-0 transition-all duration-300"
              style={{
                width: `${(pct * 100).toFixed(1)}%`,
                background: bgBase + "0.1)",
              }}
            />
            {/* Price */}
            <span
              className="font-number text-[11px] font-bold relative z-10 tabular-nums"
              style={{ color }}
            >
              {fmtPrice(px)}
            </span>
            {/* Size */}
            <span className="font-number text-[11px] text-gray-400 relative z-10 tabular-nums">
              {fmtSize(sz)}
            </span>
            {/* USD value on hover */}
            <span className="font-number text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors relative z-10 tabular-nums w-16 text-right">
              ${((parseFloat(px) * parseFloat(sz)) / 1000).toFixed(0)}K
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function LiveChart() {
  const chartContainerRef = useRef(null);
  const chartRef          = useRef(null);
  const seriesRef         = useRef(null);
  const wsRef             = useRef(null);
  const candlesRef        = useRef({});    // map: timeKey → ohlc bar
  const currentIntervalRef = useRef(null); // current 1-min bucket time

  const [coin,    setCoin]    = useState("BTC");
  const [status,  setStatus]  = useState("connecting"); // connecting | live | error
  const [lastPx,  setLastPx]  = useState(null);
  const [lastChg, setLastChg] = useState(null); // pct change from open
  const [asks,    setAsks]    = useState([]);
  const [bids,    setBids]    = useState([]);
  const [spread,  setSpread]  = useState(null);

  // ── Chart init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width:  chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background:  { type: "solid", color: "transparent" },
        textColor:   "#9ca3af",
        fontSize:    11,
        fontFamily:  "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines:   { color: "#111827", style: 1 },
        horzLines:   { color: "#111827", style: 1 },
      },
      crosshair: {
        vertLine: { color: "#374151", width: 1, style: 0 },
        horzLine: { color: "#374151", width: 1, style: 0, labelBackgroundColor: "#1f2937" },
      },
      rightPriceScale: {
        borderColor:    "#1f2937",
        textColor:      "#6b7280",
        scaleMargins:   { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor:     "#1f2937",
        timeVisible:     true,
        secondsVisible:  false,
        tickMarkFormatter: (t) => {
          const d = new Date(t * 1000);
          return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        },
      },
      handleScroll:    { mouseWheel: true, pressedMouseMove: true },
      handleScale:     { mouseWheel: true, pinch: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:          "#4ade80",
      downColor:        "#f87171",
      borderUpColor:    "#4ade80",
      borderDownColor:  "#f87171",
      wickUpColor:      "#4ade80",
      wickDownColor:    "#f87171",
      priceLineColor:   "#00e5ff",
      priceLineWidth:   1,
      priceLineStyle:   2,
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width:  chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────
  const connect = useCallback((targetCoin) => {
    // Tear down old connection + reset state
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    candlesRef.current       = {};
    currentIntervalRef.current = null;
    if (seriesRef.current) seriesRef.current.setData([]);
    setAsks([]);
    setBids([]);
    setLastPx(null);
    setLastChg(null);
    setSpread(null);
    setStatus("connecting");

    let pingInterval;

    const ws = new WebSocket(HL_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("live");

      // Subscribe trades (for candle building)
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "trades", coin: targetCoin },
      }));

      // Subscribe L2 orderbook
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "l2Book", coin: targetCoin },
      }));

      // Keep-alive ping every 20s
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" }));
      }, 20000);
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      const ch = msg.channel;
      const d  = msg.data;

      // ── Trades → candle aggregation ──────────────────────────────────
      if (ch === "trades" && Array.isArray(d)) {
        d.forEach((trade) => {
          const price = parseFloat(trade.px);
          const time  = Math.floor(trade.time / 1000);
          // Bucket to nearest minute
          const bucket = Math.floor(time / 60) * 60;

          setLastPx(price);

          const existing = candlesRef.current[bucket];
          if (!existing) {
            candlesRef.current[bucket] = {
              time,
              open:   price,
              high:   price,
              low:    price,
              close:  price,
            };
          } else {
            existing.close = price;
            if (price > existing.high) existing.high = price;
            if (price < existing.low)  existing.low  = price;
          }

          if (seriesRef.current) {
            const bar = candlesRef.current[bucket];
            seriesRef.current.update({ ...bar, time: bucket });
            // Compute % change from open of earliest candle
            const times = Object.keys(candlesRef.current).map(Number).sort((a, b) => a - b);
            if (times.length > 0) {
              const openPx = candlesRef.current[times[0]].open;
              const pct    = ((price - openPx) / openPx) * 100;
              setLastChg(pct);
            }
          }
        });
      }

      // ── L2 Book ────────────────────────────────────────────────────
      if (ch === "l2Book" && d?.levels) {
        const newBids = (d.levels[0] ?? []).slice(0, BOOK_LEVELS).map((l) => [l.px, l.sz]);
        const newAsks = (d.levels[1] ?? []).slice(0, BOOK_LEVELS).map((l) => [l.px, l.sz]);

        // Asks: sorted highest price first for visual (red on top)
        const sortedAsks = [...newAsks].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
        setBids(newBids);
        setAsks(sortedAsks);

        if (newBids.length && sortedAsks.length) {
          const bestBid = parseFloat(newBids[0][0]);
          const bestAsk = parseFloat(sortedAsks[sortedAsks.length - 1][0]);
          setSpread(((bestAsk - bestBid) / bestAsk * 100).toFixed(3));
        }
      }
    };

    ws.onerror = () => setStatus("error");

    ws.onclose = () => {
      clearInterval(pingInterval);
      if (wsRef.current === ws) {
        setStatus("error");
        // Auto-reconnect after 3s
        setTimeout(() => connect(targetCoin), 3000);
      }
    };

    return () => { clearInterval(pingInterval); };
  }, []);

  // Trigger connect on mount + coin change
  useEffect(() => {
    const cleanup = connect(coin);
    return () => {
      cleanup?.();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin]);

  // ── Orderbook max size for depth bars ─────────────────────────────────
  const maxBookSize = Math.max(
    ...bids.map(([, sz]) => parseFloat(sz)),
    ...asks.map(([, sz]) => parseFloat(sz)),
    1,
  );

  // ── Status dot ───────────────────────────────────────────────────────
  const statusDot = {
    live:       { color: "#4ade80", label: "LIVE",       animate: true  },
    connecting: { color: "#fbbf24", label: "CONNECTING", animate: false },
    error:      { color: "#f87171", label: "RECONNECT",  animate: false },
  }[status] ?? { color: "#6b7280", label: "—", animate: false };

  return (
    <section
      className="flex flex-col border border-white/[0.07] rounded-xl overflow-hidden"
      style={{ background: "rgba(5,10,22,0.97)", minHeight: "60vh" }}
    >
      {/* ── Top command bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0"
        style={{ background: "rgba(0,0,0,0.3)" }}>

        {/* Left: coin selector + status */}
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
            Hyperliquid Perpetuals
          </span>

          {/* Coin selector */}
          <div className="relative flex items-center gap-1 ml-2">
            {COINS.map((c) => (
              <button
                key={c.coin}
                onClick={() => setCoin(c.coin)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wide transition-all ${
                  coin === c.coin
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-white/30 hover:text-white/70 border border-transparent hover:border-white/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: live price + status */}
        <div className="flex items-center gap-4">
          {lastPx && (
            <div className="flex items-center gap-2">
              <span className="font-number text-lg font-black text-white tabular-nums">
                ${fmtPrice(lastPx)}
              </span>
              {lastChg !== null && (
                <span className={`font-number text-xs font-bold tabular-nums ${lastChg >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {lastChg >= 0 ? "+" : ""}{lastChg.toFixed(2)}%
                </span>
              )}
              {spread && (
                <span className="text-[9px] font-mono text-white/25">
                  Spread {spread}%
                </span>
              )}
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span className="relative inline-flex w-1.5 h-1.5">
              {statusDot.animate && (
                <span className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ background: statusDot.color }} />
              )}
              <span className="relative w-1.5 h-1.5 rounded-full"
                style={{ background: statusDot.color }} />
            </span>
            <span className="text-[8px] font-mono font-bold" style={{ color: statusDot.color }}>
              {statusDot.label}
            </span>
            {status === "live"
              ? <Wifi className="w-3 h-3" style={{ color: statusDot.color }} />
              : <WifiOff className="w-3 h-3 text-white/20" />
            }
          </div>
        </div>
      </div>

      {/* ── Chart + Orderbook row ── */}
      <div className="flex flex-1 min-h-0">

        {/* TradingView Chart — 75% */}
        <div className="flex-[3] min-w-0 relative">
          {status === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-3 text-white/20">
                <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-xs font-mono">Connecting to Hyperliquid…</span>
              </div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" style={{ minHeight: 420 }} />
        </div>

        {/* L2 Orderbook DOM — 25% */}
        <div
          className="flex-[1] min-w-[200px] max-w-[280px] flex flex-col border-l border-white/[0.06] overflow-hidden"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          {/* Orderbook header */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-white/[0.05] shrink-0">
            <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
              Order Book
            </span>
            <span className="text-[9px] font-mono text-white/20">
              {coin}-USD·PERP
            </span>
          </div>

          {/* Column headers */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.04] shrink-0">
            <span className="text-[8px] font-mono text-white/20 w-20">PRICE</span>
            <span className="text-[8px] font-mono text-white/20 text-right w-14">SIZE</span>
            <span className="text-[8px] font-mono text-white/20 text-right w-16">USD</span>
          </div>

          {/* Asks (red, top → lowest ask at bottom) */}
          <div className="flex-1 overflow-hidden flex flex-col justify-end">
            <BookSide levels={asks}  side="ask" maxSize={maxBookSize} />
          </div>

          {/* Mid price / spread */}
          <div
            className="flex items-center justify-between px-2 py-1.5 border-y border-white/[0.06] shrink-0"
            style={{ background: "rgba(0,229,255,0.04)" }}
          >
            <span className="font-number text-xs font-black text-cyan-400 tabular-nums">
              {lastPx ? `$${fmtPrice(lastPx)}` : "—"}
            </span>
            {spread && (
              <span className="text-[8px] font-mono text-white/30">
                {spread}%
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-cyan-400/50" />
          </div>

          {/* Bids (green, top → highest bid at top) */}
          <div className="flex-1 overflow-hidden flex flex-col justify-start">
            <BookSide levels={bids} side="bid" maxSize={maxBookSize} />
          </div>

          {/* Orderbook footer — cumulative imbalance */}
          {bids.length > 0 && asks.length > 0 && (() => {
            const totalBid = bids.reduce((s, [, sz]) => s + parseFloat(sz), 0);
            const totalAsk = asks.reduce((s, [, sz]) => s + parseFloat(sz), 0);
            const pct      = (totalBid / (totalBid + totalAsk)) * 100;
            return (
              <div className="px-2 py-2 border-t border-white/[0.05] shrink-0">
                <div className="flex justify-between text-[8px] font-mono mb-1">
                  <span className="text-green-400">{pct.toFixed(1)}% BUY</span>
                  <span className="text-red-400">{(100 - pct).toFixed(1)}% SELL</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-red-500/30">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-white/[0.04] shrink-0"
        style={{ background: "rgba(0,0,0,0.2)" }}>
        <span className="text-[8px] font-mono text-white/15">
          Hyperliquid WebSocket · 1-min candles · Real-time L2 DOM
        </span>
        {lastPx && (
          <span className="font-number text-[8px] text-white/15 ml-auto">
            Last: ${fmtPrice(lastPx)}
          </span>
        )}
      </div>
    </section>
  );
}
