"use client";
import { useState } from "react";
import {
  TrendingUp, TrendingDown, Activity, BarChart3, AlertTriangle, Zap, X, Info
} from "lucide-react";

const METRIC_CONFIG = [
  {
    key: "expectedReturn",
    label: "Expected Return",
    format: "pct",
    icon: TrendingUp,
    color: "text-accent-green",
    borderColor: "border-accent-green/20",
    bgGlow: "rgba(0,255,135,0.04)",
    formula: "E[Rₚ] = Σ (wᵢ × E[Rᵢ])",
    formulaDesc: "Weighted average of individual asset expected returns, annualized from daily means × 252 trading days.",
    good: "Higher is better. A value above 10% suggests the portfolio outpaces typical fixed-income alternatives.",
  },
  {
    key: "volatility",
    label: "Volatility",
    format: "pct",
    icon: Activity,
    color: "text-accent-amber",
    borderColor: "border-accent-amber/20",
    bgGlow: "rgba(255,185,0,0.04)",
    formula: "σₚ = √(Σ wᵢ²σᵢ² + Σᵢ≠ⱼ wᵢwⱼρσᵢσⱼ)",
    formulaDesc: "Portfolio standard deviation with cross-asset correlations (ρ = 0.3 avg). Annualized from daily returns × √252.",
    good: "Lower is better. Institutional portfolios typically target 12–18%. Above 25% signals elevated risk.",
  },
  {
    key: "sharpeRatio",
    label: "Sharpe Ratio",
    format: "dec",
    icon: Zap,
    color: "text-accent",
    borderColor: "border-accent/20",
    bgGlow: "rgba(0,229,255,0.04)",
    formula: "S = (Rₚ − Rf) / σₚ",
    formulaDesc: "Excess return per unit of total risk. Rf = 4.5% (risk-free rate). σₚ = portfolio volatility.",
    good: "Higher is better. > 1.0 is strong, > 1.5 is exceptional. Below 0.5 indicates poor risk-adjusted returns.",
  },
  {
    key: "sortinoRatio",
    label: "Sortino Ratio",
    format: "dec",
    icon: BarChart3,
    color: "text-accent-purple",
    borderColor: "border-accent-purple/20",
    bgGlow: "rgba(168,85,247,0.04)",
    formula: "So = (Rₚ − Rf) / σ_down",
    formulaDesc: "Like Sharpe, but penalizes only downside volatility — the std dev of negative returns only.",
    good: "Higher is better. > 1.0 is favorable, > 2.0 is excellent. More relevant than Sharpe for asymmetric return profiles.",
  },
  {
    key: "maxDrawdown",
    label: "Max Drawdown",
    format: "pct",
    icon: TrendingDown,
    color: "text-accent-red",
    borderColor: "border-accent-red/20",
    bgGlow: "rgba(255,56,96,0.04)",
    formula: "MDD = min((Pₜ − Peak) / Peak)",
    formulaDesc: "Largest historical peak-to-trough decline in portfolio value. Weighted average of individual asset drawdowns.",
    good: "Closer to 0% is better. Beyond −30% warrants tail-risk hedging. Beyond −50% signals extreme capital risk.",
  },
  {
    key: "beta",
    label: "Portfolio Beta",
    format: "dec",
    icon: AlertTriangle,
    color: "text-muted-foreground",
    borderColor: "border-border",
    bgGlow: "rgba(148,163,184,0.04)",
    formula: "β = Cov(Rₐ, Rₘ) / Var(Rₘ)",
    formulaDesc: "Sensitivity of portfolio returns relative to the S&P 500 market benchmark (SPY).",
    good: "β = 1.0 moves with the market. < 0.7 is defensive. > 1.5 amplifies market swings in both directions.",
  },
];

function formatValue(val, format) {
  if (format === "pct") return `${(val * 100).toFixed(2)}%`;
  return val.toFixed(2);
}

// ── Popover Component ──
// Inline expansion panel — no fixed positioning, no SSR issues
function MetricExpansion({ config, value, onClose }) {
  return (
    <div className="mt-3 rounded-2xl bg-surface-elevated/80 backdrop-blur-xl border border-border-bright overflow-hidden animate-fade-in-up shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-border/40"
        style={{ background: config.bgGlow }}
      >
        <div className="flex items-center gap-2.5">
          <config.icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
          <span className={`text-lg font-bold font-mono ml-2 ${config.color}`}>
            {formatValue(value, config.format)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {/* Formula block */}
        <div className="px-4 py-3 rounded-xl bg-background/50 border border-border/40">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Formula</p>
          <p className="text-base font-mono text-accent tracking-wide leading-snug">{config.formula}</p>
          <p className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed">{config.formulaDesc}</p>
        </div>

        {/* Benchmark block */}
        <div className="px-4 py-3 rounded-xl bg-accent-green/[0.04] border border-accent-green/10">
          <p className="text-[9px] uppercase tracking-widest text-accent-green/60 mb-2 font-bold flex items-center gap-1">
            <Info className="w-2.5 h-2.5" /> What&apos;s Good
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{config.good}</p>
        </div>
      </div>
    </div>
  );
}

export default function MetricsPanel({ metrics, hasAssets = false }) {
  const [activePopover, setActivePopover] = useState(null);

  const handleClick = (key) => {
    setActivePopover((prev) => (prev === key ? null : key));
  };

  // ── Empty state: no assets added yet ──
  if (!hasAssets) {
    return (
      <section className="animate-fade-in-up">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted/40" />
          <span className="text-muted/40">Quantitative Summary</span>
        </h2>
        <div className="glass-card p-10 flex flex-col items-center justify-center text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border/50 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-muted/25" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface-elevated border border-border/50 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-muted/30" />
            </div>
          </div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">No Analytics Yet</p>
          <p className="text-xs text-muted/50 max-w-xs leading-relaxed">
            Search and select assets above to construct your portfolio and generate institutional risk analytics.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 w-full max-w-xs opacity-20 pointer-events-none select-none">
            {["Sharpe", "Sortino", "Vol"].map((label) => (
              <div key={label} className="metric-card p-3">
                <div className="h-2 w-8 bg-muted/20 rounded mb-2" />
                <div className="h-5 w-12 bg-muted/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Loading state: assets added but metrics computing ──
  if (!metrics) {
    return (
      <section className="animate-fade-in-up">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          Quantitative Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {METRIC_CONFIG.map((cfg) => (
            <div key={cfg.key} className="metric-card p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded bg-muted/10" />
                <div className="h-2.5 w-16 rounded bg-muted/10" />
              </div>
              <div className="h-7 w-20 rounded bg-muted/10" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Active state: full metrics ──
  return (
    <section className="animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent" />
        Quantitative Summary
        <span className="text-[10px] font-normal normal-case tracking-normal text-muted/50 ml-1">
          Click any metric for details
        </span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRIC_CONFIG.map((cfg) => {
          const isActive = activePopover === cfg.key;
          return (
            <button
              key={cfg.key}
              onClick={() => handleClick(cfg.key)}
              className={`metric-card p-4 text-left cursor-pointer transition-all group/metric ${
                isActive ? `ring-1 ${cfg.borderColor} shadow-lg` : "hover:border-border-bright"
              }`}
              style={isActive ? { background: cfg.bgGlow } : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {cfg.label}
                </span>
              </div>
              <p className={`text-xl font-bold font-mono ${cfg.color}`}>
                {formatValue(metrics[cfg.key], cfg.format)}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[9px] text-muted/40 group-hover/metric:text-muted/70 transition-colors">
                <Info className="w-2.5 h-2.5" />
                <span>{isActive ? "Click to close" : "Click for formula"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Inline expansion panel — renders below the metric grid */}
      {activePopover && (
        <MetricExpansion
          config={METRIC_CONFIG.find((c) => c.key === activePopover)}
          value={metrics[activePopover]}
          onClose={() => setActivePopover(null)}
        />
      )}
    </section>
  );
}
