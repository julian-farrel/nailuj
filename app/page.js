"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { PanelLeft, PanelRight } from "lucide-react";
import Header from "./components/Header";
import MarketTicker from "./components/MarketTicker";
import PortfolioBuilder from "./components/PortfolioBuilder";
import MetricsPanel from "./components/MetricsPanel";
import ProjectionChart from "./components/ProjectionChart";
import ResearchReport from "./components/ResearchReport";
import NewsFeed from "./components/NewsFeed";
import CorrelationMatrix from "./components/CorrelationMatrix";
import WhaleAlerts from "./components/WhaleAlerts";
import LiveChart from "./components/LiveChart";
import {
  computeAssetMetrics,
  computePortfolioMetrics,
  generateResearchSummary,
  calcDailyReturns,
} from "@/lib/analytics";
import {
  setWeight,
  addAsset,
  removeAsset,
  getAllocationStatus,
} from "@/lib/portfolioUtils";

export default function Home() {
  // ── Sidebar visibility ──────────────────────────────────────────────
  const [isLeftOpen,  setIsLeftOpen]  = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // ── Portfolio state ─────────────────────────────────────────────────
  const [assets,    setAssets]    = useState([]);
  const [weights,   setWeights]   = useState({});
  const [preloaded, setPreloaded] = useState(false);

  // ── Live Risk-Free Rate ─────────────────────────────────────────────
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);

  useEffect(() => {
    fetch("/api/risk-free-rate")
      .then((r) => r.json())
      .then((d) => { if (d.rate != null && isFinite(d.rate)) setRiskFreeRate(d.rate); })
      .catch(() => {});
  }, []);

  // ── Pre-populate 60/40 BTC/ETH benchmark ───────────────────────────
  useEffect(() => {
    if (preloaded) return;
    setPreloaded(true);
    handleAddAsset("BTC-USD", "Bitcoin",  "crypto");
    handleAddAsset("ETH-USD", "Ethereum", "crypto");
    setWeights({ "BTC-USD": 60, "ETH-USD": 40 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloaded]);

  // ── Derived state ───────────────────────────────────────────────────
  const dailyReturnsMap = useMemo(() => {
    const map = {};
    for (const a of assets) {
      if (a._rawPrices) map[a.ticker] = calcDailyReturns(a._rawPrices);
    }
    return map;
  }, [assets]);

  const assetMetricsMap = useMemo(() => {
    const map = {};
    for (const a of assets) { if (a.metrics) map[a.ticker] = a.metrics; }
    return map;
  }, [assets]);

  const allMetricsReady = useMemo(() =>
    Object.keys(weights).length > 0 &&
    Object.keys(weights).every((t) => assetMetricsMap[t]),
    [weights, assetMetricsMap]
  );

  const { isValid: isAllocationValid } = useMemo(
    () => getAllocationStatus(weights),
    [weights]
  );

  const normalizedWeights = useMemo(() => {
    const nw = {};
    for (const [k, v] of Object.entries(weights)) nw[k] = v / 100;
    return nw;
  }, [weights]);

  const metrics = useMemo(
    () => allMetricsReady && isAllocationValid
      ? computePortfolioMetrics(assetMetricsMap, normalizedWeights, riskFreeRate)
      : null,
    [allMetricsReady, isAllocationValid, assetMetricsMap, normalizedWeights, riskFreeRate]
  );

  const research = useMemo(
    () => metrics ? generateResearchSummary(metrics) : null,
    [metrics]
  );

  const anyLoading = assets.some((a) => a.loading);

  // ── Asset Actions ───────────────────────────────────────────────────
  const handleAddAsset = useCallback(async (ticker, name, type) => {
    setAssets((prev) => [
      ...prev,
      { ticker, name, type, metrics: null, loading: true, error: null,
        currentPrice: null, priceChange24h: null, priceChangePercent24h: null, currency: "USD" },
    ]);
    setWeights((prev) => addAsset(prev, ticker));

    try {
      const res  = await fetch(`/api/historical?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch data");

      const assetPrices     = data.assetPrices.map((d) => d.close);
      const spyPrices       = data.spyPrices.map((d) => d.close);
      const computedMetrics = computeAssetMetrics(assetPrices, spyPrices);

      setAssets((prev) =>
        prev.map((a) =>
          a.ticker === ticker
            ? {
                ...a,
                metrics: computedMetrics,
                _rawPrices: assetPrices,
                loading: false,
                error: null,
                currentPrice: data.currentPrice ?? null,
                priceChange24h: data.priceChange24h ?? null,
                priceChangePercent24h: data.priceChangePercent24h ?? null,
                currency: data.currency ?? "USD",
              }
            : a
        )
      );
    } catch (err) {
      setAssets((prev) =>
        prev.map((a) =>
          a.ticker === ticker ? { ...a, loading: false, error: err.message } : a
        )
      );
    }
  }, []);

  const handleRemoveAsset  = useCallback((ticker) => {
    setAssets((prev)  => prev.filter((a) => a.ticker !== ticker));
    setWeights((prev) => removeAsset(prev, ticker));
  }, []);

  const handleWeightChange = useCallback((ticker, newValue) => {
    setWeights((prev) => setWeight(prev, ticker, newValue));
  }, []);

  const handleReset = useCallback(() => {
    setAssets([]);
    setWeights({});
  }, []);

  const assetsWithPrices = assets.filter((a) => a._rawPrices);
  const showMatrix       = assetsWithPrices.length >= 2;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── LEFT SIDEBAR: News ── */}
      <div
        className="shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: isLeftOpen ? 320 : 0,
          opacity: isLeftOpen ? 1 : 0,
          pointerEvents: isLeftOpen ? "auto" : "none",
        }}
      >
        <NewsFeed />
      </div>

      {/* ── CENTER WORKSPACE ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Sticky Header + Ticker */}
        <div className="sticky top-0 z-30 shrink-0">
          <Header riskFreeRate={riskFreeRate} />
          <MarketTicker />
        </div>

        {/* ── Command Bar (sidebar toggles) ── */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 border-b border-white/[0.05] shrink-0"
          style={{ background: "rgba(5,10,22,0.6)", backdropFilter: "blur(8px)" }}
        >
          {/* Left panel toggle */}
          <button
            onClick={() => setIsLeftOpen((v) => !v)}
            title={isLeftOpen ? "Collapse news panel" : "Expand news panel"}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide border transition-all ${
              isLeftOpen
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-white/[0.03] border-white/[0.08] text-white/30 hover:text-white/60 hover:border-white/20"
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
            <span>News</span>
          </button>

          <div className="flex-1" />

          {/* Workspace label */}
          <span className="text-[9px] font-mono text-white/20 tracking-widest uppercase">
            Trading Workspace
          </span>

          <div className="flex-1" />

          {/* Right panel toggle */}
          <button
            onClick={() => setIsRightOpen((v) => !v)}
            title={isRightOpen ? "Collapse whale panel" : "Expand whale panel"}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide border transition-all ${
              isRightOpen
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-white/[0.03] border-white/[0.08] text-white/30 hover:text-white/60 hover:border-white/20"
            }`}
          >
            <span>Whales</span>
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Scrollable main content ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <main className="p-4 space-y-4 min-w-0">

            {/* ═══════════════════════════════════════════════════════════
                HERO SECTION — Live Trading Chart + L2 Orderbook
            ═══════════════════════════════════════════════════════════ */}
            <div style={{ minHeight: "60vh" }}>
              <LiveChart />
            </div>

            {/* ═══════════════════════════════════════════════════════════
                SECONDARY SECTION — Quantitative Analytics
            ═══════════════════════════════════════════════════════════ */}
            <div
              className="rounded-2xl p-4 space-y-4 border border-white/[0.05]"
              style={{ background: "rgba(3,7,15,0.7)" }}
            >
              {/* Section label */}
              <div className="flex items-center gap-3 pb-1 border-b border-white/[0.05]">
                <span className="text-[9px] font-mono font-bold text-white/25 uppercase tracking-[0.2em]">
                  ◈ Quantitative Analytics
                </span>
                <div className="flex-1 h-px bg-white/[0.04]" />
                <span className="text-[8px] font-mono text-white/15">
                  Portfolio Construction & Risk Engine
                </span>
              </div>

              {/* Metrics (full width) */}
              <MetricsPanel metrics={metrics} hasAssets={assets.length > 0} />

              {/* Portfolio Builder (4) + Projection Chart (8) */}
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-12 xl:col-span-4 min-w-0">
                  <PortfolioBuilder
                    assets={assets}
                    weights={weights}
                    onAddAsset={handleAddAsset}
                    onRemoveAsset={handleRemoveAsset}
                    onWeightChange={handleWeightChange}
                    onReset={handleReset}
                  />
                </div>
                <div className="col-span-12 xl:col-span-8 min-w-0">
                  <ProjectionChart
                    portfolioReturn={metrics?.expectedReturn ?? null}
                    assetMetricsMap={assetMetricsMap}
                    hasAssets={assets.length > 0}
                  />
                </div>
              </div>

              {/* Correlation Matrix (6) + Research Report (6) */}
              {(showMatrix || (metrics && !anyLoading)) && (
                <div className="grid grid-cols-12 gap-4 items-start">
                  {showMatrix && (
                    <div className="col-span-12 xl:col-span-6 min-w-0">
                      <CorrelationMatrix
                        assets={assetsWithPrices}
                        assetDailyReturns={dailyReturnsMap}
                      />
                    </div>
                  )}
                  {metrics && !anyLoading && (
                    <div className={`min-w-0 ${showMatrix ? "col-span-12 xl:col-span-6" : "col-span-12"}`}>
                      <ResearchReport
                        research={research}
                        assets={assets}
                        weights={weights}
                        metrics={metrics}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

          </main>

          {/* Footer */}
          <footer className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between mt-2"
            style={{ background: "rgba(6,13,26,0.5)", backdropFilter: "blur(8px)" }}>
            <p className="text-[10px] font-mono text-white/20">
              © {new Date().getFullYear()} Nailuj Terminal. All rights reserved.
            </p>
            <p className="text-[10px] font-mono text-white/20">
              Institutional Use Only — Not For Redistribution
            </p>
          </footer>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR: Whale Alerts ── */}
      <div
        className="shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: isRightOpen ? 292 : 0,
          opacity: isRightOpen ? 1 : 0,
          pointerEvents: isRightOpen ? "auto" : "none",
        }}
      >
        <WhaleAlerts />
      </div>

    </div>
  );
}
