"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, X, Loader2, AlertCircle, Trash2,
  DollarSign, TrendingUp, TrendingDown, Check,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Neon palette for pie slices ────────────────────────────
const SLICE_COLORS = [
  "#00e5ff", "#00ff87", "#a855f7", "#ffb900",
  "#ff3860", "#38bdf8", "#fb923c", "#4ade80",
];

// ── Custom tooltip for the pie chart ──────────────────────
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-surface-elevated/95 backdrop-blur border border-border-bright rounded-xl px-3 py-2 shadow-xl text-xs font-mono">
      <span className="text-foreground font-bold">{name}</span>
      <span className="text-muted-foreground ml-2">{value.toFixed(1)}%</span>
    </div>
  );
}

// ── Custom legend ──────────────────────────────────────────
function PieLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
      {payload.map((entry) => (
        <span key={entry.value} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export default function PortfolioBuilder({
  assets,
  weights,
  onAddAsset,
  onRemoveAsset,
  onWeightChange,
  onReset,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchTimeout = useRef(null);

  // ── Allocation maths ────────────────────────────────────
  const total = useMemo(
    () => Math.round(Object.values(weights).reduce((s, v) => s + v, 0) * 100) / 100,
    [weights],
  );
  const delta = Math.round((total - 100) * 100) / 100;
  const isValid = delta === 0 && assets.length > 0;
  const isOver = delta > 0;

  // ── Pie chart data (only assets with weight > 0) ────────
  const pieData = useMemo(() =>
    assets
      .filter((a) => (weights[a.ticker] ?? 0) > 0)
      .map((a) => ({ name: a.ticker, value: weights[a.ticker] ?? 0 })),
    [assets, weights],
  );

  // ── Debounced search ────────────────────────────────────
  const handleSearch = useCallback((value) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    setShowDropdown(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item) => {
    if (!assets.some((a) => a.ticker === item.symbol)) {
      onAddAsset(item.symbol, item.name, item.type);
    }
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const existingTickers = new Set(assets.map((a) => a.ticker));

  const fmtPrice = (price, currency = "USD") => {
    if (price == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // ── Allocation status label ─────────────────────────────
  const statusLabel = () => {
    if (assets.length === 0) return null;
    if (isValid) {
      return (
        <span className="flex items-center gap-1 text-accent-green">
          <Check className="w-3 h-3" /> 100% — Analytics Active
        </span>
      );
    }
    if (isOver) {
      return (
        <span className="text-accent-red">
          Over-allocated by {delta.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="text-accent-amber">
        {Math.abs(delta).toFixed(1)}% remaining to allocate
      </span>
    );
  };

  return (
    <section className="glass-card p-5 animate-fade-in-up space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Portfolio Constructor</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set exact weights · Analytics unlock at 100%
          </p>
        </div>
        {assets.length > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-muted-foreground hover:text-accent-red hover:border-accent-red/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated border border-border focus-within:border-accent/50 focus-within:shadow-[0_0_20px_rgba(0,229,255,0.06)] transition-all">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder='Search ticker or name (e.g. "AAPL", "Bitcoin")'
            className="flex-1 bg-transparent text-lg text-foreground placeholder-muted-foreground focus:outline-none font-medium"
          />
          {searching && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
          {query && !searching && (
            <button onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated/95 backdrop-blur-xl border border-border-bright rounded-xl shadow-2xl z-50 max-h-[260px] overflow-y-auto">
            {searching && results.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching markets…
              </div>
            )}
            {!searching && results.length === 0 && query.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" /> No results for &quot;{query}&quot;
              </div>
            )}
            {results.map((item) => {
              const added = existingTickers.has(item.symbol);
              return (
                <button
                  key={item.symbol}
                  onClick={() => !added && handleSelect(item)}
                  disabled={added}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all ${added ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-hover"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-accent font-mono shrink-0">{item.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground font-mono">
                      {item.type}
                    </span>
                    {added
                      ? <Check className="w-3.5 h-3.5 text-accent-green" />
                      : <span className="text-[10px] text-accent">+ Add</span>
                    }
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {assets.length === 0 && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated/60 border border-border/50 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-muted/40" />
          </div>
          <p className="text-sm text-muted-foreground">No assets selected</p>
          <p className="text-xs text-muted/50 mt-1">Search above to begin</p>
        </div>
      )}

      {assets.length > 0 && (
        <>
          {/* ── Allocation bar + status ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-muted-foreground">Total Allocation</span>
              <span className={`text-sm font-bold font-mono ${isValid ? "text-accent-green" : isOver ? "text-accent-red" : "text-accent-amber"}`}>
                {total.toFixed(1)}%
              </span>
            </div>
            {/* Multi-segment bar */}
            <div className="allocation-bar overflow-hidden flex">
              {pieData.map((d, i) => (
                <div
                  key={d.name}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(d.value, 100)}%`,
                    background: SLICE_COLORS[i % SLICE_COLORS.length],
                    opacity: 0.85,
                  }}
                />
              ))}
              {/* Red overflow indicator */}
              {isOver && (
                <div className="h-full w-1 bg-accent-red animate-pulse" />
              )}
            </div>
            <p className={`text-[11px] font-mono mt-1.5 flex items-center gap-1 ${isValid ? "text-accent-green" : isOver ? "text-accent-red" : "text-accent-amber"}`}>
              {statusLabel()}
            </p>
          </div>

          {/* ── Pie chart ── */}
          {pieData.length > 0 && (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="75%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend content={<PieLegend />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Compact asset table ── */}
          <div className="rounded-xl overflow-hidden border border-border/50">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-2 bg-surface-elevated/60 border-b border-border/40 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <span>Asset</span>
              <span className="text-right">Price</span>
              <span className="text-right">Weight</span>
              <span />
            </div>

            {/* Rows */}
            {assets.map((asset, i) => {
              const weight = weights[asset.ticker] ?? 0;
              const color = SLICE_COLORS[i % SLICE_COLORS.length];
              const m = asset.metrics;

              // Derived tear-sheet values
              const beta     = m ? m.beta.toFixed(2)                    : "—";
              const vol      = m ? (m.volatility  * 100).toFixed(1) + "%" : "—";
              const maxDD    = m ? (m.maxDrawdown  * 100).toFixed(1) + "%" : "—";
              const ret      = m ? (m.expectedReturn * 100).toFixed(1) + "%" : "—";

              // Mini trend based on 24h change
              const chg = asset.priceChangePercent24h;
              const trendLabel = chg == null ? "—"
                : chg > 1   ? "▲ Bullish"
                : chg < -1  ? "▼ Bearish"
                : "→ Neutral";
              const trendColor = chg == null ? "rgba(255,255,255,0.3)"
                : chg > 0   ? "#22c55e"
                : chg < 0   ? "#f87171"
                : "#94a3b8";

              return (
                <div
                  key={asset.ticker}
                  className="relative grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2.5 border-b border-border/20 last:border-0 hover:bg-surface-hover/30 transition-colors group"
                >
                  {/* ── Tear Sheet Popover ── */}
                  <div
                    className="absolute left-0 top-full z-50 pointer-events-none
                      opacity-0 group-hover:opacity-100
                      translate-y-1 group-hover:translate-y-0
                      transition-all duration-200"
                    style={{ width: "220px" }}
                  >
                    <div style={{
                      background: "rgba(8,14,28,0.97)",
                      backdropFilter: "blur(20px)",
                      border: `1px solid ${color}40`,
                      borderRadius: "12px",
                      padding: "12px 14px",
                      boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${color}20`,
                    }}>
                      {/* Popover header */}
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "monospace" }}>
                          {asset.ticker}
                        </span>
                        <span style={{ fontSize: "9px", color: trendColor, fontFamily: "monospace", marginLeft: "auto" }}>
                          {trendLabel}
                        </span>
                      </div>

                      {/* Stat grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                        {[
                          { label: "Exp. Return", value: ret,   accent: "#00e5ff" },
                          { label: "Volatility",  value: vol,   accent: "#f59e0b" },
                          { label: "Beta (β)",    value: beta,  accent: "#a855f7" },
                          { label: "Max Drawdown",value: maxDD, accent: "#f87171" },
                        ].map(({ label, value, accent }) => (
                          <div key={label} style={{
                            background: "rgba(255,255,255,0.04)",
                            borderRadius: "7px",
                            padding: "6px 8px",
                          }}>
                            <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginBottom: "2px" }}>
                              {label}
                            </div>
                            <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace", color: accent }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 24h change bar */}
                      {chg != null && (
                        <div style={{ marginTop: "9px" }}>
                          <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: "4px" }}>
                            24H CHANGE
                          </div>
                          <div style={{
                            height: "4px", borderRadius: "2px",
                            background: "rgba(255,255,255,0.07)", overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: "2px",
                              width: `${Math.min(Math.abs(chg) * 10, 100)}%`,
                              background: chg >= 0 ? "#22c55e" : "#f87171",
                              transition: "width 0.3s",
                            }} />
                          </div>
                          <div style={{
                            fontSize: "9px", fontFamily: "monospace",
                            color: chg >= 0 ? "#22c55e" : "#f87171",
                            textAlign: "right", marginTop: "3px",
                          }}>
                            {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Ticker + Name ── */}
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <div className="min-w-0 overflow-hidden flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold font-mono text-foreground cursor-default shrink-0">
                          {asset.ticker}
                        </span>
                        {asset.loading && (
                          <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" />
                        )}
                        {asset.priceChangePercent24h != null && !asset.loading && (
                          <span className={`text-[9px] font-mono shrink-0 ${asset.priceChangePercent24h >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                            {asset.priceChangePercent24h >= 0 ? <TrendingUp className="w-2.5 h-2.5 inline" /> : <TrendingDown className="w-2.5 h-2.5 inline" />}
                            {" "}{asset.priceChangePercent24h >= 0 ? "+" : ""}{asset.priceChangePercent24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight max-w-full">{asset.name}</p>
                    </div>
                  </div>

                  {/* Current price */}
                  <div className="text-right">
                    {asset.loading
                      ? <span className="text-[10px] text-muted/40 font-mono">…</span>
                      : (
                        <span className="text-xs font-mono text-muted-foreground">
                          {fmtPrice(asset.currentPrice, asset.currency)}
                        </span>
                      )
                    }
                    {asset.error && (
                      <span className="text-[9px] text-accent-red flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> Err
                      </span>
                    )}
                  </div>

                  {/* Weight input */}
                  <div className="flex items-center gap-0.5 justify-end">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={weight}
                      id={`w-${asset.ticker}`}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        onWeightChange(asset.ticker, val);
                      }}
                      className="w-12 bg-transparent border-none text-right text-lg font-mono font-black focus:outline-none focus:ring-0 text-white"
                    />
                    <span className="text-xs font-mono text-muted-foreground">%</span>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveAsset(asset.ticker)}
                    className="w-6 h-6 flex items-center justify-center text-muted/30 opacity-0 group-hover:opacity-100 hover:text-accent-red transition-all rounded"
                    title="Remove asset"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Validation banner ── */}
          {!isValid && assets.length > 0 && (
            <div className={`rounded-xl px-4 py-3 text-xs font-mono border flex items-center gap-2 ${
              isOver
                ? "bg-accent-red/5 border-accent-red/20 text-accent-red"
                : "bg-accent-amber/5 border-accent-amber/20 text-accent-amber"
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {isOver
                ? `Over-allocated by ${delta.toFixed(1)}%. Reduce weights to unlock analytics.`
                : `${Math.abs(delta).toFixed(1)}% remaining to allocate. Set weights to exactly 100% to enable the analytics engine.`
              }
            </div>
          )}
        </>
      )}
    </section>
  );
}
