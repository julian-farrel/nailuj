"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, X, Plus, Minus, Check, RotateCcw, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Activity
} from "lucide-react";

export default function PortfolioBuilder({
  assets,        // array of { ticker, name, type, metrics, loading, error }
  weights,       // { ticker: number (0-100) }
  onAddAsset,    // (ticker, name, type) => void
  onRemoveAsset, // (ticker) => void
  onWeightChange,// (ticker, value) => void
  onReset,       // () => void
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchTimeout = useRef(null);

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(totalWeight - 100) < 0.01;
  const remaining = 100 - totalWeight;

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
    const alreadyAdded = assets.some((a) => a.ticker === item.symbol);
    if (!alreadyAdded) {
      onAddAsset(item.symbol, item.name, item.type);
    }
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const existingTickers = new Set(assets.map((a) => a.ticker));

  return (
    <section className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-foreground">Portfolio Constructor</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Search any stock, crypto, ETF, or commodity
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border-bright transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative mb-5" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated border border-border focus-within:border-accent/50 transition-all">
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
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated/95 backdrop-blur-xl border border-border-bright rounded-xl shadow-2xl z-50 max-h-[280px] overflow-y-auto">
            {searching && results.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching...
              </div>
            )}
            {!searching && results.length === 0 && query.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" /> No results found
              </div>
            )}
            {results.map((item) => {
              const alreadyAdded = existingTickers.has(item.symbol);
              return (
                <button
                  key={item.symbol}
                  onClick={() => !alreadyAdded && handleSelect(item)}
                  disabled={alreadyAdded}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all ${
                    alreadyAdded
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-surface-hover cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-accent font-mono shrink-0">
                      {item.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground font-mono">
                      {item.type}
                    </span>
                    {alreadyAdded ? (
                      <Check className="w-3.5 h-3.5 text-accent-green" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Allocation Progress Bar ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground">Total Allocation</span>
          <span
            className={`text-sm font-bold font-mono ${
              isValid ? "text-accent-green" : totalWeight > 100 ? "text-accent-red" : "text-accent-amber"
            }`}
          >
            {totalWeight.toFixed(1)}% / 100%
          </span>
        </div>
        <div className="allocation-bar">
          <div
            className="allocation-fill"
            style={{
              width: `${Math.min(totalWeight, 100)}%`,
              background: isValid
                ? "linear-gradient(90deg, #00e5ff, #00ff87)"
                : totalWeight > 100
                ? "linear-gradient(90deg, #ff3860, #ff6b6b)"
                : "linear-gradient(90deg, #ffb900, #ff8c00)",
            }}
          />
        </div>
        {!isValid && (
          <p className={`text-[11px] mt-1.5 font-mono ${totalWeight > 100 ? "text-accent-red" : "text-accent-amber"}`}>
            {totalWeight > 100
              ? `Over-allocated by ${(totalWeight - 100).toFixed(1)}%`
              : `${remaining.toFixed(1)}% remaining to allocate`}
          </p>
        )}
        {isValid && (
          <p className="text-[11px] mt-1.5 font-mono text-accent-green flex items-center gap-1">
            <Check className="w-3 h-3" /> Portfolio fully allocated — analytics active
          </p>
        )}
      </div>

      {/* ── Active Assets List ── */}
      {assets.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search and add assets to build your portfolio</p>
        </div>
      )}

      <div className="space-y-2">
        {assets.map((asset) => {
          const weight = weights[asset.ticker] || 0;
          return (
            <div
              key={asset.ticker}
              className="rounded-xl bg-surface-elevated/80 border border-border-bright p-3 transition-all"
            >
              {/* Top row: asset info + remove button */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-foreground font-mono">
                    {asset.ticker}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {asset.name}
                  </span>
                  {asset.loading && (
                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
                  )}
                  {asset.error && (
                    <span className="text-[10px] text-accent-red flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-accent">
                    {weight.toFixed(0)}%
                  </span>
                  <button
                    onClick={() => onRemoveAsset(asset.ticker)}
                    className="w-6 h-6 rounded-md bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-accent-red hover:border-accent-red/30 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Slider row */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => onWeightChange(asset.ticker, Math.max(0, weight - 5))}
                  className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-bright transition-all"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range" min="0" max="100" step="1" value={weight}
                  onChange={(e) => onWeightChange(asset.ticker, Number(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={() => onWeightChange(asset.ticker, Math.min(100, weight + 5))}
                  className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-bright transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <input
                  type="number" min="0" max="100" value={weight}
                  onChange={(e) =>
                    onWeightChange(asset.ticker, Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                  }
                  className="w-16 px-2 py-1 rounded-lg bg-surface border border-border text-center text-sm font-mono text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              {/* Live metrics row */}
              {asset.metrics && !asset.loading && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono text-muted-foreground">
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

              {asset.error && (
                <p className="mt-2 text-[11px] text-accent-red">{asset.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
