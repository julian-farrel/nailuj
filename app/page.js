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
  const [assets, setAssets]   = useState([]);
  const [weights, setWeights] = useState({});
  const [preloaded, setPreloaded] = useState(false);

  // ── Live Risk-Free Rate (13-week T-Bill via ^IRX) ───────────────
  const [riskFreeRate, setRiskFreeRate] = useState(0.045); // fallback

  useEffect(() => {
    fetch("/api/risk-free-rate")
      .then((r) => r.json())
      .then((d) => {
        if (d.rate != null && isFinite(d.rate)) {
          setRiskFreeRate(d.rate);
        }
      })
      .catch(() => {}); // silently keep fallback
  }, []);

  // ── Pre-populate 60/40 BTC/ETH benchmark on first mount ─────
  useEffect(() => {
    if (preloaded) return;
    setPreloaded(true);
    handleAddAsset("BTC-USD", "Bitcoin", "crypto");
    handleAddAsset("ETH-USD", "Ethereum", "crypto");
    setWeights({ "BTC-USD": 60, "ETH-USD": 40 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloaded]);

  // ── Derived state ──────────────────────────────────────────

  // Map of ticker → raw daily returns array (for correlation matrix)
  const dailyReturnsMap = useMemo(() => {
    const map = {};
    for (const a of assets) {
      if (a._rawPrices) map[a.ticker] = calcDailyReturns(a._rawPrices);
    }
    return map;
  }, [assets]);

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

  // ── Asset Actions ──────────────────────────────────────────

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

      const assetPrices   = data.assetPrices.map((d) => d.close);
      const spyPrices     = data.spyPrices.map((d) => d.close);
      const computedMetrics = computeAssetMetrics(assetPrices, spyPrices);
      // Store raw prices so CorrelationMatrix can compute daily returns
      const rawPrices = assetPrices;

      setAssets((prev) =>
        prev.map((a) =>
          a.ticker === ticker
            ? {
                ...a,
                metrics: computedMetrics,
                _rawPrices: rawPrices,
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

  const handleWeightChange = useCallback((ticker, newValue) => {
    setWeights((prev) => setWeight(prev, ticker, newValue));
  }, []);

  const handleReset = useCallback(() => {
    setAssets([]);
    setWeights({});
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    // Outermost: full-screen flex row, no overflow
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-background, #060d1a)",
      }}
    >
      {/* ── LEFT: Fixed News Sidebar ── */}
      <NewsFeed />

      {/* ── CENTER: Scrollable workspace ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          minWidth: 0,
        }}
      >
        {/* Sticky top bar (Header + Ticker) */}
        <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
          <Header riskFreeRate={riskFreeRate} />
          <MarketTicker />
        </div>

        {/* Main content */}
        <main style={{ flex: 1, padding: "28px 28px 0", minWidth: 0 }}>
          {/* Primary grid: Portfolio Builder | Analytics stack */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* Portfolio Builder */}
            <div style={{ minWidth: 0 }}>
              <PortfolioBuilder
                assets={assets}
                weights={weights}
                onAddAsset={handleAddAsset}
                onRemoveAsset={handleRemoveAsset}
                onWeightChange={handleWeightChange}
                onReset={handleReset}
              />
            </div>

            {/* Analytics stack */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
              <MetricsPanel metrics={metrics} hasAssets={assets.length > 0} />
              <ProjectionChart
                portfolioReturn={metrics?.expectedReturn ?? null}
                assetMetricsMap={assetMetricsMap}
                hasAssets={assets.length > 0}
              />
            </div>
          </div>

          {/* Correlation Matrix — visible as soon as 2+ assets have data */}
          {assets.filter((a) => a._rawPrices).length >= 2 && (
            <div style={{ marginTop: "24px" }}>
              <CorrelationMatrix
                assets={assets.filter((a) => a._rawPrices)}
                assetDailyReturns={dailyReturnsMap}
              />
            </div>
          )}

          {/* Research Report */}
          {metrics && !anyLoading && (
            <div style={{ marginTop: "24px" }}>
              <ResearchReport
                research={research}
                assets={assets}
                weights={weights}
                metrics={metrics}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer
          style={{
            width: "100%",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(6,13,26,0.5)",
            backdropFilter: "blur(8px)",
            padding: "18px 28px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginTop: "32px",
          }}
        >
          <p style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", margin: 0 }}>
            © {new Date().getFullYear()} Nailuj Terminal. All rights reserved.
          </p>
          <p style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", margin: 0 }}>
            Institutional Use Only — Not For Redistribution
          </p>
        </footer>
      </div>

      {/* ── RIGHT: Whale Alerts Sidebar ── */}
      <WhaleAlerts />
    </div>
  );
}
