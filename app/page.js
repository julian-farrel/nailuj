"use client";
import { useState, useMemo, useCallback } from "react";
import Header from "./components/Header";
import PortfolioBuilder from "./components/PortfolioBuilder";
import MetricsPanel from "./components/MetricsPanel";
import ProjectionChart from "./components/ProjectionChart";
import ResearchReport from "./components/ResearchReport";
import { computePortfolioMetrics, generateResearchSummary } from "@/lib/analytics";

export default function Home() {
  const [selectedAssets, setSelectedAssets] = useState(["SPY", "QQQ", "AAPL", "BTC"]);
  const [weights, setWeights] = useState({ SPY: 30, QQQ: 25, AAPL: 25, BTC: 20 });

  const totalWeight = useMemo(
    () => Object.values(weights).reduce((s, v) => s + v, 0),
    [weights]
  );
  const isValid = Math.abs(totalWeight - 100) < 0.01;

  const handleToggleAsset = useCallback((ticker) => {
    setSelectedAssets((prev) => {
      if (prev.includes(ticker)) {
        setWeights((w) => {
          const copy = { ...w };
          delete copy[ticker];
          return copy;
        });
        return prev.filter((t) => t !== ticker);
      }
      setWeights((w) => ({ ...w, [ticker]: 0 }));
      return [...prev, ticker];
    });
  }, []);

  const handleWeightChange = useCallback((ticker, value) => {
    setWeights((w) => ({ ...w, [ticker]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedAssets([]);
    setWeights({});
  }, []);

  // Convert percentage weights to decimals for analytics
  const normalizedWeights = useMemo(() => {
    const nw = {};
    for (const [k, v] of Object.entries(weights)) {
      nw[k] = v / 100;
    }
    return nw;
  }, [weights]);

  const metrics = useMemo(
    () => (isValid ? computePortfolioMetrics(normalizedWeights) : null),
    [isValid, normalizedWeights]
  );

  const research = useMemo(
    () => (metrics ? generateResearchSummary(metrics) : null),
    [metrics]
  );

  return (
    <div className="min-h-screen bg-grid">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top row: Builder + Metrics side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Portfolio Builder - takes left side */}
          <div className="lg:col-span-5">
            <PortfolioBuilder
              selectedAssets={selectedAssets}
              weights={weights}
              onToggleAsset={handleToggleAsset}
              onWeightChange={handleWeightChange}
              onReset={handleReset}
            />
          </div>

          {/* Right column: Metrics + Chart */}
          <div className="lg:col-span-7 space-y-6">
            {isValid && metrics ? (
              <>
                <MetricsPanel metrics={metrics} />
                <ProjectionChart portfolioReturn={metrics.expectedReturn} />
              </>
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Allocate Your Portfolio
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select assets and set weights to exactly <span className="text-accent font-mono font-bold">100%</span> to activate the quantitative analytics engine and forward projections.
                </p>
                <div className="mt-4 px-4 py-2 rounded-lg bg-surface-elevated border border-border">
                  <span className="text-xs font-mono text-muted-foreground">
                    Current allocation:{" "}
                    <span className={totalWeight > 100 ? "text-accent-red" : "text-accent-amber"}>
                      {totalWeight.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Research Report - full width */}
        {isValid && research && <ResearchReport research={research} />}

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
