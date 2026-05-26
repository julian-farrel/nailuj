"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, RefreshCw, LayoutGrid } from "lucide-react";

const POLL_INTERVAL = 60_000; // match server revalidation

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtPct(n) {
  if (n == null || !isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtVol(n) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5)   return "just now";
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── CoinGecko coin image helper ─────────────────────────────────────────────
// top_3_coins_id gives us coin IDs (e.g. "bitcoin"), not image URLs.
// We use the small static thumb from CoinGecko's CDN pattern as a best-effort
// fallback; the coin-specific icons will load or gracefully error out.
function CoinIcon({ coinId, index }) {
  return (
    <img
      src={`https://assets.coingecko.com/coins/images/1/thumb/${coinId}.png`}
      alt={coinId}
      title={coinId}
      onError={(e) => {
        // Fall back to a lettered placeholder
        e.currentTarget.style.display = "none";
        e.currentTarget.nextSibling.style.display = "flex";
      }}
      className="w-5 h-5 rounded-full border border-black/40 object-cover"
      style={{ marginLeft: index > 0 ? -6 : 0, zIndex: 10 - index }}
    />
  );
}

// ── Skeleton row ───────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
      <div className="flex-[3] h-3 rounded bg-white/[0.06]" />
      <div className="w-16 h-3 rounded bg-white/[0.06]" />
      <div className="w-16 h-3 rounded bg-white/[0.06]" />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-5 h-5 rounded-full bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SectorAlerts() {
  const [sectors,   setSectors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [spinning,  setSpinning]  = useState(false);

  const fetchSectors = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const res  = await fetch("/api/sectors");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch sectors");
      setSectors(data.sectors || []);
      setFetchedAt(data.fetchedAt);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setSpinning(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
    const id = setInterval(() => fetchSectors(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchSectors]);

  // Derived: separate gainers/losers for summary badges
  const gainers = sectors.filter((s) => s.market_cap_change_24h > 0).length;
  const losers  = sectors.filter((s) => s.market_cap_change_24h < 0).length;

  return (
    <section
      className="glass-card overflow-hidden animate-fade-in-up"
      style={{ minHeight: "50vh" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
        style={{ background: "rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-white/85 leading-none">
              Global Narrative Tracker
            </h2>
            <p className="text-[9px] font-mono text-white/30 mt-0.5">
              Top 20 crypto sectors · 24h performance · CoinGecko
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Gainers / Losers badges */}
          {!loading && sectors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded">
                <TrendingUp className="w-2.5 h-2.5" />
                {gainers} UP
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded">
                <TrendingDown className="w-2.5 h-2.5" />
                {losers} DOWN
              </span>
            </div>
          )}

          {/* Timestamp */}
          {fetchedAt && (
            <span className="text-[9px] font-mono text-white/20 hidden sm:block">
              {timeAgo(fetchedAt)}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchSectors(true)}
            className="text-white/25 hover:text-white/70 transition-colors p-1.5 rounded-md hover:bg-white/[0.05]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Column headers ── */}
      <div className="grid grid-cols-[1fr_80px_90px_72px] gap-x-3 px-6 py-2 border-b border-white/[0.04]">
        {["NARRATIVE", "24H CHG", "VOLUME", "COINS"].map((h) => (
          <span key={h} className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-widest">
            {h}
          </span>
        ))}
      </div>

      {/* ── Rows ── */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(50vh - 120px)" }}>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
            <TrendingDown className="w-8 h-8" />
            <p className="text-xs font-mono">{error}</p>
          </div>
        ) : sectors.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-white/20 text-xs font-mono">
            No sector data available
          </div>
        ) : (
          sectors.map((sector, idx) => {
            const isPos  = sector.market_cap_change_24h >= 0;
            const pctAbs = Math.abs(sector.market_cap_change_24h);
            // Heatmap bar: intensity mapped 0–10% range
            const intensity = Math.min(pctAbs / 10, 1);
            const barColor  = isPos
              ? `rgba(74,222,128,${0.05 + intensity * 0.12})`
              : `rgba(248,113,113,${0.05 + intensity * 0.12})`;

            return (
              <div
                key={sector.id}
                className="relative grid grid-cols-[1fr_80px_90px_72px] gap-x-3 items-center px-6 py-2.5 border-b border-white/[0.03] group transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Heatmap background bar */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${(intensity * 35).toFixed(1)}%`,
                    background: barColor,
                    borderRight: `1px solid ${isPos ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)"}`,
                  }}
                />

                {/* Col 1: Rank + Name */}
                <div className="relative flex items-center gap-2 min-w-0">
                  <span className="font-number text-[9px] text-white/20 w-4 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  <span className="text-[12px] font-semibold text-white/85 truncate leading-none">
                    {sector.name}
                  </span>
                </div>

                {/* Col 2: 24h % change */}
                <div className="relative flex items-center gap-1">
                  {isPos
                    ? <TrendingUp   className="w-3 h-3 text-green-400 shrink-0" />
                    : <TrendingDown className="w-3 h-3 text-red-400   shrink-0" />
                  }
                  <span
                    className={`font-number text-[12px] font-bold tabular-nums ${
                      isPos ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {fmtPct(sector.market_cap_change_24h)}
                  </span>
                </div>

                {/* Col 3: Volume */}
                <span className="font-number relative text-[12px] text-gray-300 tabular-nums font-medium">
                  {fmtVol(sector.volume_24h)}
                </span>

                {/* Col 4: Top coin icons */}
                <div className="relative flex items-center">
                  {sector.top_3_coins.length > 0
                    ? sector.top_3_coins.map((coinId, i) => (
                        <span key={coinId} className="relative" style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i }}>
                          <img
                            src={`https://assets.coingecko.com/coins/images/1/thumb/${coinId}.png`}
                            alt={coinId}
                            title={coinId}
                            className="w-5 h-5 rounded-full border border-black/50 object-cover bg-white/[0.06]"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </span>
                      ))
                    : <span className="text-[8px] font-mono text-white/15">—</span>
                  }
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-between px-6 py-2 border-t border-white/[0.04]"
        style={{ background: "rgba(0,0,0,0.15)" }}
      >
        <span className="text-[8px] font-mono text-white/15">
          Data from CoinGecko · Refreshes every 60s
        </span>
        <span className="font-number text-[8px] font-mono text-white/15">
          {sectors.length} sectors tracked
        </span>
      </div>
    </section>
  );
}
