"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Info } from "lucide-react";

const POLL_INTERVAL = 10_000;

function formatUSD(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatPrice(p) {
  if (!p) return "—";
  if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 1)    return `$${p.toFixed(2)}`;
  return `$${p.toFixed(6)}`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)    return "just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const SOURCE_BADGE = {
  Binance:      { label: "BINANCE TAPE",  bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20" },
  Hyperliquid:  { label: "HYPERLIQUID",   bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20"   },
};

const TYPE_LABEL = {
  MARKET: "Market Order",
  WALL:   "L2 Resting Wall",
};

const SIDE_CONFIG = {
  BUY:  { border: "border-l-green-500",  dot: "bg-green-500",  label: "BUY",  labelColor: "text-green-400",  bg: "bg-green-500/10"  },
  SELL: { border: "border-l-red-500",    dot: "bg-red-500",    label: "SELL", labelColor: "text-red-400",    bg: "bg-red-500/10"    },
};

function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const side    = SIDE_CONFIG[alert.side]  || SIDE_CONFIG.BUY;
  const srcBadge = SOURCE_BADGE[alert.source] || SOURCE_BADGE.Binance;

  return (
    <div
      className={`mb-3 border border-white/[0.08] rounded-xl overflow-hidden border-l-2 ${side.border} transition-all`}
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      {/* ── Card header ── */}
      <div className="p-3.5">
        {/* Row 1: Asset + Amount + Time */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Asset pill */}
            <span className={`shrink-0 text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${side.bg} ${side.labelColor}`}>
              {alert.asset}
            </span>
            {/* USD amount */}
            <span className="font-number text-xl font-black text-white tracking-tight">
              {formatUSD(alert.usdValue)}
            </span>
            {alert.usdValue >= 5_000_000 && (
              <span className="text-base leading-none">🚨</span>
            )}
          </div>
          {/* Timestamp */}
          <span className="font-mono text-[9px] text-gray-500 shrink-0 pt-0.5">
            {timeAgo(alert.time)}
          </span>
        </div>

        {/* Row 2: Badges */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Side badge */}
          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${side.bg} ${side.labelColor}`}>
            {side.label}
          </span>
          {/* Source badge */}
          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${srcBadge.bg} ${srcBadge.text} ${srcBadge.border}`}>
            {srcBadge.label}
          </span>
          {/* Type badge */}
          <span className="text-[9px] font-mono text-gray-500 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
            {TYPE_LABEL[alert.type] ?? alert.type}
          </span>
          {/* Unusual activity */}
          {alert.unusualActivity && (
            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
              ⚡ {alert.unusualPct?.toFixed(1)}% of 24h Vol
            </span>
          )}
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto text-gray-600 hover:text-gray-300 transition-colors"
            title="Details"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ── Expanded key-value table ── */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-3.5 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 bg-black/20">
          {[
            { label: "Price",      value: formatPrice(alert.price)          },
            { label: "Qty",        value: alert.qty != null ? alert.qty.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—" },
            { label: "24h Vol",    value: formatUSD(alert.volume24h ?? 0)   },
            { label: "Source",     value: alert.source                      },
            { label: "Type",       value: TYPE_LABEL[alert.type] ?? alert.type },
            alert.unusualActivity
              ? { label: "Anomaly %", value: `${alert.unusualPct?.toFixed(3)}%`, highlight: true }
              : null,
          ].filter(Boolean).map(({ label, value, highlight }) => (
            <div key={label}>
              <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-0.5">{label}</div>
              <div className={`font-number text-[11px] font-semibold ${highlight ? "text-orange-400" : "text-gray-200"}`}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WhaleAlerts() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState([]);
  const seenIds = useRef(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const res  = await fetch("/api/whale-alerts");
      const data = await res.json();
      if (!data.alerts) return;

      const newAlerts = data.alerts.filter((a) => !seenIds.current.has(a.id));
      newAlerts.forEach((a) => seenIds.current.add(a.id));
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));
      }
      if (data.topCoinsScanned) setScanned(data.topCoinsScanned);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  // Derived stats
  const buyCount  = alerts.filter((a) => a.side === "BUY").length;
  const sellCount = alerts.filter((a) => a.side === "SELL").length;
  const total     = buyCount + sellCount;
  const buyPct    = total > 0 ? Math.round((buyCount / total) * 100) : 50;

  return (
    <aside
      className="flex flex-col h-screen shrink-0 border-l border-white/[0.06]"
      style={{ width: 292, minWidth: 292, background: "rgba(8,14,28,0.95)", backdropFilter: "blur(20px)" }}
    >
      <style>{`
        .wa-scroll::-webkit-scrollbar { display: none; }
        @keyframes wa-ping { 0%{transform:scale(1);opacity:0.8;} 70%{transform:scale(2.5);opacity:0;} 100%{transform:scale(2.5);opacity:0;} }
        @keyframes wa-slide { from{opacity:0;transform:translateX(10px);} to{opacity:1;transform:translateX(0);} }
      `}</style>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-45"
                style={{ animation: "wa-ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
              <span className="relative w-2 h-2 rounded-full bg-cyan-400" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.14em] text-white/75 font-mono uppercase">
              Whale Alerts
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-white/20">≥$1M</span>
            <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.5 rounded">
              LIVE
            </span>
          </div>
        </div>

        {/* Buy / Sell ratio bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[8.5px] font-mono mb-1">
            <span className="text-green-400 font-bold">{buyCount} BUY</span>
            <span className="text-red-400 font-bold">{sellCount} SELL</span>
          </div>
          <div className="h-1.5 rounded-full bg-red-500/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${buyPct}%` }}
            />
          </div>
        </div>

        {/* Scanned coins */}
        {scanned.length > 0 && (
          <p className="text-[8px] font-mono text-white/20 truncate">
            Scanning: {scanned.slice(0, 10).join(" · ")}
            {scanned.length > 10 && ` +${scanned.length - 10}`}
          </p>
        )}
      </div>

      {/* ── Alert list ── */}
      <div className="wa-scroll flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3 rounded-xl border border-white/[0.06] p-3.5 bg-white/[0.02] animate-pulse space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-14 rounded-md bg-white/[0.06]" />
                <div className="h-5 w-24 rounded bg-white/[0.08]" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-4 w-10 rounded bg-white/[0.04]" />
                <div className="h-4 w-16 rounded bg-white/[0.04]" />
                <div className="h-4 w-20 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
            <span className="text-3xl">🐋</span>
            <span className="text-xs font-mono">Hunting for $1M+ anomalies…</span>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2 border-t border-white/[0.05] shrink-0 flex items-center justify-between">
        <span className="text-[8px] font-mono text-white/15">
          Binance + Hyperliquid · 10s
        </span>
        <span className="font-number text-[8px] text-white/15">
          {alerts.length} alerts
        </span>
      </div>
    </aside>
  );
}
