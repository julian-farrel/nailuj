"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, X, Check, RotateCcw, Loader2, AlertCircle, Trash2,
  TrendingUp, TrendingDown, Activity, DollarSign, Target
} from "lucide-react";

export default function PortfolioBuilder({
  assets,           // [{ ticker, name, type, metrics, loading, error, currentPrice, priceChange24h, priceChangePercent24h, currency }]
  weights,          // { ticker: number (0-100) } — always sums to 100
  onAddAsset,       // (ticker, name, type) => void
  onRemoveAsset,    // (ticker) => void
  onWeightChange,   // (ticker, newValue) => void — triggers auto-normalization in parent
  onReset,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchTimeout = useRef(null);

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(totalWeight - 100) < 0.5;

  // Debounced search
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

  // Close dropdown on outside click
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

  // Format price nicely
  const fmtPrice = (price, currency = "USD") => {
    if (price == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <section className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-foreground">Portfolio Constructor</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Search any asset · Weights auto-balance to 100%
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

      {/* ── Search Bar ── */}
      <div className="relative mb-5" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated border border-border focus-within:border-accent/50 focus-within:shadow-[0_0_20px_rgba(0,229,255,0.06)] transition-all">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder='Search ticker or name (e.g. "AAPL", "Bitcoin", "Gold")'
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
          />
          {searching && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
          {query && !searching && (
            <button onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated/95 backdrop-blur-xl border border-border-bright rounded-xl shadow-2xl z-50 max-h-[280px] overflow-y-auto">
            {searching && results.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching markets...
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
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all ${
                    added ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-hover cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-accent font-mono shrink-0">{item.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground font-mono">
                      {item.type}
                    </span>
                    {added ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <span className="text-[10px] text-accent">+ Add</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Allocation Bar ── */}
      {assets.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground">Total Allocation</span>
            <span className={`text-sm font-bold font-mono ${isValid ? "text-accent-green" : "text-accent-amber"}`}>
              {totalWeight.toFixed(1)}%
            </span>
          </div>
          <div className="allocation-bar">
            <div
              className="allocation-fill"
              style={{
                width: `${Math.min(totalWeight, 100)}%`,
                background: isValid
                  ? "linear-gradient(90deg, #00e5ff, #00ff87)"
                  : "linear-gradient(90deg, #ffb900, #ff8c00)",
              }}
            />
          </div>
          <p className="text-[11px] mt-1.5 font-mono text-accent-green flex items-center gap-1">
            <Check className="w-3 h-3" /> Weights auto-balance — analytics always active
          </p>
        </div>
      )}

      {/* ── Empty State ── */}
      {assets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-surface-elevated/60 border border-border/50 flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-muted/40" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No assets selected</p>
          <p className="text-xs text-muted/60">
            Search above to add stocks, crypto, ETFs, or commodities
          </p>
        </div>
      )}

      {/* ── Asset Cards ── */}
      <div className="space-y-2.5">
        {assets.map((asset) => {
          const weight = weights[asset.ticker] ?? 0;
          const hasMetrics = asset.metrics && !asset.loading;
          const projectedPrice =
            hasMetrics && asset.currentPrice != null
              ? asset.currentPrice * (1 + asset.metrics.expectedReturn)
              : null;

          return (
            <div
              key={asset.ticker}
              className="group rounded-xl bg-surface-elevated/70 border border-border hover:border-border-bright p-4 transition-all"
            >
              {/* Row 1: Ticker, Name, Weight Input, Remove */}
              <div className="flex items-center gap-3">
                {/* Asset identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-mono">{asset.ticker}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{asset.name}</span>
                    {asset.loading && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />}
                  </div>
                </div>

                {/* Weight input */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(weight)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      onWeightChange(asset.ticker, val);
                    }}
                    className="w-[48px] px-1 py-1 bg-transparent border-none text-right text-sm font-mono font-bold text-accent focus:outline-none focus:ring-0"
                  />
                  <span className="text-sm font-mono text-muted-foreground">%</span>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemoveAsset(asset.ticker)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/40 opacity-0 group-hover:opacity-100 hover:text-accent-red hover:bg-accent-red/5 transition-all"
                  title="Remove asset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 2: Price context + metrics */}
              {(hasMetrics || asset.currentPrice != null) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* Current price + 24h change */}
                  {asset.currentPrice != null && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {fmtPrice(asset.currentPrice, asset.currency)}
                      </span>
                      {asset.priceChangePercent24h != null && (
                        <span
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                            asset.priceChangePercent24h >= 0
                              ? "text-accent-green bg-accent-green/8"
                              : "text-accent-red bg-accent-red/8"
                          }`}
                        >
                          {asset.priceChangePercent24h >= 0 ? "+" : ""}
                          {asset.priceChangePercent24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* 1-year projected price */}
                  {projectedPrice != null && (
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-accent-purple" />
                      <span className="text-[10px] font-mono text-muted-foreground">1Y Target:</span>
                      <span className="text-[10px] font-mono font-semibold text-accent-purple">
                        {fmtPrice(projectedPrice, asset.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Row 3: Risk metrics */}
              {hasMetrics && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-accent-green" />
                    Ret: {(asset.metrics.expectedReturn * 100).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-accent-amber" />
                    Vol: {(asset.metrics.volatility * 100).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    β: {asset.metrics.beta.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-accent-red" />
                    MDD: {(asset.metrics.maxDrawdown * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Error state */}
              {asset.error && (
                <p className="mt-2 text-[11px] text-accent-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {asset.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
