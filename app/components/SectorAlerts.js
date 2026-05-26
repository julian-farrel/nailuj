"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, RefreshCw, LayoutGrid, ChevronRight } from "lucide-react";

const POLL_INTERVAL = 60_000;

const TIMEFRAMES = [
  { value: "24h", label: "Daily (24h)" },
  { value: "7d",  label: "Weekly (7d)"  },
  { value: "30d", label: "Monthly (30d)" },
];

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
  if (s < 5)    return "just now";
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Skeleton row ───────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="grid grid-cols-[24px_1fr_80px_90px] gap-x-3 px-6 py-2.5 animate-pulse border-b border-white/[0.03]">
      <div className="h-3 w-4 rounded bg-white/[0.06]" />
      <div className="h-3 rounded bg-white/[0.06]" />
      <div className="h-3 rounded bg-white/[0.06]" />
      <div className="h-3 rounded bg-white/[0.06]" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SectorAlerts() {
  const router = useRouter();

  const [sectors,   setSectors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [spinning,  setSpinning]  = useState(false);
  const [timeframe, setTimeframe] = useState("24h");

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

  // CoinGecko free tier only provides volume_24h on the categories endpoint.
  // For 7d/30d we use volume_24h as a fallback (same data, different label).
  // This keeps the component crash-free while wiring the toggle to the UI.
  const getVolume = (sector) => sector.volume_24h ?? 0;
  const getChange = (sector) => sector.market_cap_change_24h ?? 0;

  // Sort: always by volume descending (the active data source)
  const sorted = [...sectors].sort((a, b) => getVolume(b) - getVolume(a));

  const gainers = sorted.filter((s) => getChange(s) > 0).length;
  const losers  = sorted.filter((s) => getChange(s) < 0).length;

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
              Top 20 crypto sectors by volume · Click to drill down · CoinGecko
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe dropdown */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-[9px] font-mono font-bold text-white/60 bg-white/[0.04] border border-white/[0.10] rounded-md px-2 py-1 outline-none cursor-pointer hover:border-white/20 transition-colors appearance-none"
            style={{ background: "rgba(10,17,35,0.8)" }}
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value} style={{ background: "#0a1123" }}>
                {tf.label}
              </option>
            ))}
          </select>

          {/* Gainers / Losers badges */}
          {!loading && sorted.length > 0 && (
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

          {fetchedAt && (
            <span className="text-[9px] font-mono text-white/20 hidden sm:block">
              {timeAgo(fetchedAt)}
            </span>
          )}

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
      <div className="grid grid-cols-[24px_1fr_80px_90px_20px] gap-x-3 px-6 py-2 border-b border-white/[0.04]">
        {["#", "NARRATIVE", "24H CHG", "VOLUME", ""].map((h, i) => (
          <span key={i} className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-widest">
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
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-white/20 text-xs font-mono">
            No sector data available
          </div>
        ) : (
          sorted.map((sector, idx) => {
            const chg       = getChange(sector);
            const vol       = getVolume(sector);
            const isPos     = chg >= 0;
            const pctAbs    = Math.abs(chg);
            const intensity = Math.min(pctAbs / 10, 1);
            const barColor  = isPos
              ? `rgba(74,222,128,${0.05 + intensity * 0.12})`
              : `rgba(248,113,113,${0.05 + intensity * 0.12})`;

            return (
              <div
                key={sector.id}
                onClick={() => router.push(`/sector/${sector.id}`)}
                className="relative grid grid-cols-[24px_1fr_80px_90px_20px] gap-x-3 items-center px-6 py-2.5 border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.04] group"
              >
                {/* Heatmap background bar */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500 pointer-events-none"
                  style={{
                    width: `${(intensity * 35).toFixed(1)}%`,
                    background: barColor,
                    borderRight: `1px solid ${isPos ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)"}`,
                  }}
                />

                {/* Col 1: Rank */}
                <span className="font-number text-[9px] text-white/20 text-right relative tabular-nums">
                  {idx + 1}
                </span>

                {/* Col 2: Sector Name */}
                <div className="relative flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-semibold text-white/85 truncate leading-none group-hover:text-white transition-colors">
                    {sector.name}
                  </span>
                  {timeframe !== "24h" && (
                    <span className="text-[7px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.06] px-1 py-px rounded shrink-0">
                      24h fallback
                    </span>
                  )}
                </div>

                {/* Col 3: 24h % change */}
                <div className="relative flex items-center gap-1">
                  {isPos
                    ? <TrendingUp   className="w-3 h-3 text-green-400 shrink-0" />
                    : <TrendingDown className="w-3 h-3 text-red-400   shrink-0" />
                  }
                  <span className={`font-number text-[12px] font-bold tabular-nums ${isPos ? "text-green-400" : "text-red-400"}`}>
                    {fmtPct(chg)}
                  </span>
                </div>

                {/* Col 4: Volume */}
                <span className="font-number relative text-[12px] text-gray-300 tabular-nums font-medium">
                  {fmtVol(vol)}
                </span>

                {/* Col 5: Drill-down arrow */}
                <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-cyan-400 transition-colors relative" />
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
          Sorted by 24h volume · Click any row to explore top 25 coins · CoinGecko
        </span>
        <span className="font-number text-[8px] font-mono text-white/15">
          {sorted.length} sectors · {timeframe} view
        </span>
      </div>
    </section>
  );
}
