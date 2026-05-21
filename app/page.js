"use client";
import { useState, useMemo, useCallback } from "react";
import Header from "./components/Header";
import MarketTicker from "./components/MarketTicker";
import PortfolioBuilder from "./components/PortfolioBuilder";
import MetricsPanel from "./components/MetricsPanel";
import ProjectionChart from "./components/ProjectionChart";
import ResearchReport from "./components/ResearchReport";
import NewsFeed from "./components/NewsFeed";
import {
  computeAssetMetrics,
  computePortfolioMetrics,
  generateResearchSummary,
} from "@/lib/analytics";
import {
  setWeight,
  addAsset,
  removeAsset,
  getAllocationStatus,
} from "@/lib/portfolioUtils";

export default function Home() {
  // assets: [{
  //   ticker, name, type,
  //   metrics: { expectedReturn, volatility, downsideDeviation, beta, maxDrawdown },
  //   loading, error,
  //   currentPrice, priceChange24h, priceChangePercent24h, currency
  // }]
  const [assets, setAssets] = useState([]);

  // weights: { ticker: number (0-100) } — always auto-normalized to 100
  const [weights, setWeights] = useState({});

  // ── Derived state ──────────────────────────────────────────

  const assetMetricsMap = useMemo(() => {
    const map = {};
    for (const a of assets) {
      if (a.metrics) map[a.ticker] = a.metrics;
    }
    return map;
  }, [assets]);

  const allMetricsReady = useMemo(() =>
    Object.keys(weights).length > 0 &&
    Object.keys(weights).every((t) => assetMetricsMap[t]),
    [weights, assetMetricsMap]
  );

  // Gate analytics on BOTH all metrics loaded AND exactly 100% allocated
  const { isValid: isAllocationValid } = useMemo(
    () => getAllocationStatus(weights),
    [weights]
  );

  // Normalized to decimals for the analytics engine
  const normalizedWeights = useMemo(() => {
    const nw = {};
    for (const [k, v] of Object.entries(weights)) nw[k] = v / 100;
    return nw;
  }, [weights]);

  const metrics = useMemo(
    () => allMetricsReady && isAllocationValid
      ? computePortfolioMetrics(assetMetricsMap, normalizedWeights)
      : null,
    [allMetricsReady, isAllocationValid, assetMetricsMap, normalizedWeights]
  );

  const research = useMemo(
    () => metrics ? generateResearchSummary(metrics) : null,
    [metrics]
  );

  const anyLoading = assets.some((a) => a.loading);

  // ── Asset Actions ──────────────────────────────────────────

  const handleAddAsset = useCallback(async (ticker, name, type) => {
    // 1. Immediately add asset card with loading state + rebalanced weights
    setAssets((prev) => [
      ...prev,
      { ticker, name, type, metrics: null, loading: true, error: null,
        currentPrice: null, priceChange24h: null, priceChangePercent24h: null, currency: "USD" },
    ]);
    setWeights((prev) => addAsset(prev, ticker));

    // 2. Fetch historical data + quote
    try {
      const res = await fetch(`/api/historical?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch data");

      const assetPrices = data.assetPrices.map((d) => d.close);
      const spyPrices = data.spyPrices.map((d) => d.close);
      const computedMetrics = computeAssetMetrics(assetPrices, spyPrices);

      setAssets((prev) =>
        prev.map((a) =>
          a.ticker === ticker
            ? {
                ...a,
                metrics: computedMetrics,
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

  const handleRemoveAsset = useCallback((ticker) => {
    setAssets((prev) => prev.filter((a) => a.ticker !== ticker));
    setWeights((prev) => removeAsset(prev, ticker));
  }, []);

  // Independent weight update — no rebalancing
  const handleWeightChange = useCallback((ticker, newValue) => {
    setWeights((prev) => setWeight(prev, ticker, newValue));
  }, []);

  const handleReset = useCallback(() => {
    setAssets([]);
    setWeights({});
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-grid flex flex-col">
      <Header />
      <MarketTicker />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Portfolio Builder */}
          <div className="lg:col-span-5">
            <PortfolioBuilder
              assets={assets}
              weights={weights}
              onAddAsset={handleAddAsset}
              onRemoveAsset={handleRemoveAsset}
              onWeightChange={handleWeightChange}
              onReset={handleReset}
            />
          </div>

          {/* Right: Analytics */}
          <div className="lg:col-span-7 space-y-6">
            <MetricsPanel metrics={metrics} hasAssets={assets.length > 0} />
            <ProjectionChart
              portfolioReturn={metrics?.expectedReturn ?? null}
              assetMetricsMap={assetMetricsMap}
              hasAssets={assets.length > 0}
            />
            <NewsFeed />
          </div>
        </div>

        {/* Research Report — contains the Export PDF button */}
        {metrics && !anyLoading && (
          <ResearchReport
            research={research}
            assets={assets}
            weights={weights}
            metrics={metrics}
          />
        )}
      </main>

      {/* Footer (Full Width) */}
      <footer className="w-full border-t border-border/30 bg-background/50 backdrop-blur-sm pt-6 pb-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[11px] font-mono text-muted/50">
          © {new Date().getFullYear()} Meridian Capital Partners, LLC. All rights reserved.
        </p>
        <p className="text-[11px] font-mono text-muted/50">
          Institutional Use Only — Not For Redistribution
        </p>
      </footer>
    </div>
  );
}
