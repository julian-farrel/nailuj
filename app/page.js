"use client";
import { useState, useMemo, useCallback } from "react";
import Header from "./components/Header";
import PortfolioBuilder from "./components/PortfolioBuilder";
import MetricsPanel from "./components/MetricsPanel";
import ProjectionChart from "./components/ProjectionChart";
import ResearchReport from "./components/ResearchReport";
import {
  computeAssetMetrics,
  computePortfolioMetrics,
  generateResearchSummary,
} from "@/lib/analytics";

export default function Home() {
  // assets: [{ ticker, name, type, metrics, loading, error }]
  const [assets, setAssets] = useState([]);
  // weights: { ticker: number (0-100) }
  const [weights, setWeights] = useState({});

  const totalWeight = useMemo(
    () => Object.values(weights).reduce((s, v) => s + v, 0),
    [weights]
  );
  const isValid = Math.abs(totalWeight - 100) < 0.01;

  // Build assetMetricsMap from loaded assets
  const assetMetricsMap = useMemo(() => {
    const map = {};
    for (const asset of assets) {
      if (asset.metrics) {
        map[asset.ticker] = asset.metrics;
      }
    }
    return map;
  }, [assets]);

  // Check if all weighted assets have metrics loaded
  const allMetricsLoaded = useMemo(() => {
    return Object.keys(weights).every(
      (ticker) => assetMetricsMap[ticker] && weights[ticker] >= 0
    );
  }, [weights, assetMetricsMap]);

  // Normalize weights to decimals
  const normalizedWeights = useMemo(() => {
    const nw = {};
    for (const [k, v] of Object.entries(weights)) {
      nw[k] = v / 100;
    }
    return nw;
  }, [weights]);

  // Compute portfolio metrics
  const metrics = useMemo(
    () =>
      isValid && allMetricsLoaded
        ? computePortfolioMetrics(assetMetricsMap, normalizedWeights)
        : null,
    [isValid, allMetricsLoaded, assetMetricsMap, normalizedWeights]
  );

  const research = useMemo(
    () => (metrics ? generateResearchSummary(metrics) : null),
    [metrics]
  );

  // ── Add asset: fetch historical data + compute metrics ──
  const handleAddAsset = useCallback(async (ticker, name, type) => {
    // Add immediately with loading state
    setAssets((prev) => [
      ...prev,
      { ticker, name, type, metrics: null, loading: true, error: null },
    ]);
    setWeights((prev) => ({ ...prev, [ticker]: 0 }));

    try {
      const res = await fetch(
        `/api/historical?ticker=${encodeURIComponent(ticker)}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch data");
      }

      // Extract closing prices
      const assetPrices = data.assetPrices.map((d) => d.close);
      const spyPrices = data.spyPrices.map((d) => d.close);

      // Compute metrics from raw prices
      const metrics = computeAssetMetrics(assetPrices, spyPrices);

      setAssets((prev) =>
        prev.map((a) =>
          a.ticker === ticker
            ? { ...a, metrics, loading: false, error: null }
            : a
        )
      );
    } catch (err) {
      setAssets((prev) =>
        prev.map((a) =>
          a.ticker === ticker
            ? { ...a, loading: false, error: err.message }
            : a
        )
      );
    }
  }, []);

  const handleRemoveAsset = useCallback((ticker) => {
    setAssets((prev) => prev.filter((a) => a.ticker !== ticker));
    setWeights((prev) => {
      const copy = { ...prev };
      delete copy[ticker];
      return copy;
    });
  }, []);

  const handleWeightChange = useCallback((ticker, value) => {
    setWeights((prev) => ({ ...prev, [ticker]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setAssets([]);
    setWeights({});
  }, []);

  const anyLoading = assets.some((a) => a.loading);

  return (
    <div className="min-h-screen bg-grid">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Portfolio Builder - left side */}
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

          {/* Right column: Metrics + Chart */}
          <div className="lg:col-span-7 space-y-6">
            {isValid && metrics && !anyLoading ? (
              <>
                <MetricsPanel metrics={metrics} />
                <ProjectionChart
                  portfolioReturn={metrics.expectedReturn}
                  assetMetricsMap={assetMetricsMap}
                />
              </>
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-4">
                  {anyLoading ? (
                    <svg className="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {anyLoading
                    ? "Fetching Market Data..."
                    : assets.length === 0
                    ? "Build Your Portfolio"
                    : "Allocate Your Portfolio"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {anyLoading
                    ? "Computing risk metrics from live historical data. This may take a moment."
                    : assets.length === 0
                    ? "Search for any stock, cryptocurrency, ETF, or commodity to get started with live market analytics."
                    : <>Set weights to exactly <span className="text-accent font-mono font-bold">100%</span> to activate the quantitative analytics engine.</>}
                </p>
                {!anyLoading && assets.length > 0 && (
                  <div className="mt-4 px-4 py-2 rounded-lg bg-surface-elevated border border-border">
                    <span className="text-xs font-mono text-muted-foreground">
                      Current allocation:{" "}
                      <span className={totalWeight > 100 ? "text-accent-red" : "text-accent-amber"}>
                        {totalWeight.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Research Report */}
        {isValid && research && !anyLoading && <ResearchReport research={research} />}

        {/* Footer */}
        <footer className="border-t border-border/30 pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-mono text-muted/50">
            © {new Date().getFullYear()} Meridian Capital Partners, LLC. All rights reserved.
          </p>
          <p className="text-[11px] font-mono text-muted/50">
            Institutional Use Only — Not For Redistribution
          </p>
        </footer>
      </main>
    </div>
  );
}
