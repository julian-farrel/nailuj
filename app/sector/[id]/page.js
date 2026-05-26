"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Layers, BarChart3 } from "lucide-react";

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtPrice(n) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1)     return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01)  return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

function fmtLarge(n) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000)     return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)         return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04] animate-pulse">
      <td className="px-4 py-3.5"><div className="w-5 h-3 rounded bg-white/[0.06]" /></td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-white/[0.06]" />
            <div className="h-2 w-10 rounded bg-white/[0.04]" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="h-3 w-20 rounded bg-white/[0.06] ml-auto" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-20 rounded bg-white/[0.06] ml-auto" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-20 rounded bg-white/[0.06] ml-auto" /></td>
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SectorPage() {
  const { id }                      = useParams();
  const [coins,    setCoins]        = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [error,    setError]        = useState(null);
  const [fetchedAt, setFetchedAt]   = useState(null);
  const [spinning, setSpinning]     = useState(false);

  const title = id ? slugToTitle(String(id)) : "Sector";

  const fetchCoins = async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const res  = await fetch(`/api/sector-coins?category=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch coins");
      setCoins(data.coins || []);
      setFetchedAt(data.fetchedAt);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setSpinning(false), 600);
    }
  };

  useEffect(() => {
    if (id) fetchCoins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Derived summary stats
  const totalMcap = coins.reduce((s, c) => s + (c.market_cap   ?? 0), 0);
  const totalVol  = coins.reduce((s, c) => s + (c.total_volume ?? 0), 0);
  const topCoin   = coins[0];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-background, #060d1a)" }}
    >
      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-white/[0.06]"
        style={{ background: "rgba(6,13,26,0.95)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-mono group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Terminal
          </Link>
          <span className="text-white/10 font-mono">/</span>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white/85">{title}</span>
            <span className="text-[9px] font-mono text-white/30 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded">
              Top 25
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="text-[9px] font-mono text-white/20 hidden md:block">
              {new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchCoins(true)}
            className="text-white/25 hover:text-white/70 transition-colors p-1.5 rounded-md hover:bg-white/[0.05]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-5">

        {/* ── Summary strip ── */}
        {!loading && coins.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Sector",         value: title,                    mono: false },
              { label: "Coins Shown",    value: coins.length,             mono: false },
              { label: "Total Mkt Cap",  value: fmtLarge(totalMcap),      mono: true  },
              { label: "24h Volume",     value: fmtLarge(totalVol),       mono: true  },
            ].map(({ label, value, mono }) => (
              <div
                key={label}
                className="rounded-xl border border-white/[0.07] p-4"
                style={{ background: "rgba(10,17,35,0.7)" }}
              >
                <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest mb-2">{label}</p>
                <p className={`text-xl font-black text-white/90 truncate ${mono ? "font-number tabular-nums" : ""}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Main table ── */}
        <div
          className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "rgba(8,14,28,0.9)" }}
        >
          {/* Table header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
            style={{ background: "rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h1 className="text-sm font-bold text-white/85">
                {title} · Top Coins
              </h1>
            </div>
            <span className="text-[9px] font-mono text-white/25">
              {coins.length} coins · sorted by market cap
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr
                  className="border-b border-white/[0.06]"
                  style={{ background: "rgba(0,0,0,0.15)" }}
                >
                  {[
                    { label: "#",          cls: "w-12 text-center pl-4"  },
                    { label: "Asset",      cls: "text-left"              },
                    { label: "Price",      cls: "text-right"             },
                    { label: "Market Cap", cls: "text-right"             },
                    { label: "24h Volume", cls: "text-right pr-6"        },
                  ].map(({ label, cls }) => (
                    <th
                      key={label}
                      className={`py-3 text-[8px] font-mono font-bold text-white/25 uppercase tracking-widest px-4 ${cls}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-white/20">
                        <BarChart3 className="w-8 h-8" />
                        <p className="text-sm font-mono">{error}</p>
                      </div>
                    </td>
                  </tr>
                ) : coins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-white/20 text-sm font-mono">
                      No coins found for this category
                    </td>
                  </tr>
                ) : (
                  coins.map((coin, idx) => {
                    const isTopGainer = idx === 0;
                    return (
                      <tr
                        key={coin.id}
                        className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.03] group"
                      >
                        {/* Rank */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-number text-[11px] text-white/25 tabular-nums">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Asset */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                              {coin.image && (
                                <img
                                  src={coin.image}
                                  alt={coin.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-white/85 truncate leading-none group-hover:text-white transition-colors">
                                {coin.name}
                              </p>
                              <p className="text-[10px] font-mono font-bold text-white/30 uppercase mt-0.5">
                                {coin.symbol}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-number text-[12px] font-semibold text-white/85 tabular-nums">
                            {fmtPrice(coin.current_price)}
                          </span>
                        </td>

                        {/* Market Cap */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-number text-[12px] text-gray-300 tabular-nums font-medium">
                            {fmtLarge(coin.market_cap)}
                          </span>
                        </td>

                        {/* Volume */}
                        <td className="px-4 py-3.5 text-right pr-6">
                          <span className="font-number text-[12px] text-gray-400 tabular-nums">
                            {fmtLarge(coin.total_volume)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!loading && coins.length > 0 && (
            <div
              className="flex items-center justify-between px-6 py-3 border-t border-white/[0.04]"
              style={{ background: "rgba(0,0,0,0.15)" }}
            >
              <span className="text-[8px] font-mono text-white/15">
                CoinGecko · Top 25 by market cap · Cached 60s
              </span>
              <Link
                href="/"
                className="text-[9px] font-mono text-cyan-400/50 hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Terminal
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
