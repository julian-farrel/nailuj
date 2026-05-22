"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import Header from "./components/Header";
import MarketTicker from "./components/MarketTicker";
import PortfolioBuilder from "./components/PortfolioBuilder";
import MetricsPanel from "./components/MetricsPanel";
import ProjectionChart from "./components/ProjectionChart";
import ResearchReport from "./components/ResearchReport";
import NewsFeed from "./components/NewsFeed";
import CorrelationMatrix from "./components/CorrelationMatrix";
import WhaleAlerts from "./components/WhaleAlerts";
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
  const [assets,    setAssets]    = useState([]);
  const [weights,   setWeights]   = useState({});
  const [preloaded, setPreloaded] = useState(false);

  // ── Live Risk-Free Rate ─────────────────────────────────────────
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);

  useEffect(() => {
    fetch("/api/risk-free-rate")
      .then((r) => r.json())
      .then((d) => { if (d.rate != null && isFinite(d.rate)) setRiskFreeRate(d.rate); })
      .catch(() => {});
  }, []);

  // ── Pre-populate 60/40 BTC/ETH benchmark ───────────────────────
  useEffect(() => {
    if (preloaded) return;
    setPreloaded(true);
    handleAddAsset("BTC-USD", "Bitcoin",  "crypto");
    handleAddAsset("ETH-USD", "Ethereum", "crypto");
    setWeights({ "BTC-USD": 60, "ETH-USD": 40 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloaded]);

  // ── Derived state ───────────────────────────────────────────────
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

  // ── Asset Actions ───────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-background, #060d1a)" }}>

      {/* LEFT: News sidebar */}
      <NewsFeed />

      {/* CENTER: Scrollable 12-col workspace */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto overflow-x-hidden">

        {/* Sticky header + ticker */}
        <div className="sticky top-0 z-30">
          <Header riskFreeRate={riskFreeRate} />
          <MarketTicker />
        </div>

        {/* ── 12-column main grid ── */}
        <main className="flex-1 p-6 min-w-0">
          <div className="grid grid-cols-12 gap-6 items-start">

            {/* ROW 1 ── Metrics (full width) */}
            <div className="col-span-12">
              <MetricsPanel metrics={metrics} hasAssets={assets.length > 0} />
            </div>

            {/* ROW 2 ── Portfolio Builder (4 cols) + Projection Chart (8 cols) */}
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

            {/* ROW 3 ── Correlation Matrix (6 cols) + Research Report (6 cols) */}
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
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-white/[0.06] bg-[rgba(6,13,26,0.5)] backdrop-blur-sm px-6 py-4 flex items-center justify-between mt-6">
          <p className="text-[10px] font-mono text-white/20 m-0">
            © {new Date().getFullYear()} Nailuj Terminal. All rights reserved.
          </p>
          <p className="text-[10px] font-mono text-white/20 m-0">
            Institutional Use Only — Not For Redistribution
          </p>
        </footer>

      </div>

      {/* RIGHT: Whale Alerts sidebar */}
      <WhaleAlerts />

    </div>
  );
}
