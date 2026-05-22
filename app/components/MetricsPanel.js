"use client";
import { useState } from "react";
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  AlertTriangle, Zap, X, Info,
} from "lucide-react";

const METRIC_CONFIG = [
  {
    key: "expectedReturn",
    label: "Expected Return",
    format: "pct",
    icon: TrendingUp,
    color: "#00ff87",
    borderColor: "border-[#00ff87]/30",
    bgGlow: "rgba(0,255,135,0.05)",
    formula: "E[Rₚ] = Σ (wᵢ × E[Rᵢ])",
    formulaDesc: "Weighted average of individual asset expected returns, annualized from daily means × 252 trading days.",
    good: "Higher is better. A value above 10% suggests the portfolio outpaces typical fixed-income alternatives.",
  },
  {
    key: "volatility",
    label: "Volatility",
    format: "pct",
    icon: Activity,
    color: "#ffb900",
    borderColor: "border-[#ffb900]/30",
    bgGlow: "rgba(255,185,0,0.05)",
    formula: "σₚ = √(Σ wᵢ²σᵢ² + Σᵢ≠ⱼ wᵢwⱼρσᵢσⱼ)",
    formulaDesc: "Portfolio standard deviation with cross-asset correlations. Annualized from daily returns × √252.",
    good: "Lower is better. Institutional portfolios typically target 12–18%. Above 25% signals elevated risk.",
  },
  {
    key: "sharpeRatio",
    label: "Sharpe Ratio",
    format: "dec",
    icon: Zap,
    color: "#00e5ff",
    borderColor: "border-[#00e5ff]/30",
    bgGlow: "rgba(0,229,255,0.05)",
    formula: "S = (Rₚ − Rf) / σₚ",
    formulaDesc: "Excess return per unit of total risk. Rf = live 13-week T-Bill rate. σₚ = portfolio volatility.",
    good: "> 1.0 is strong, > 1.5 is exceptional. Below 0.5 indicates poor risk-adjusted returns.",
  },
  {
    key: "sortinoRatio",
    label: "Sortino Ratio",
    format: "dec",
    icon: BarChart3,
    color: "#a855f7",
    borderColor: "border-[#a855f7]/30",
    bgGlow: "rgba(168,85,247,0.05)",
    formula: "So = (Rₚ − Rf) / σ_down",
    formulaDesc: "Like Sharpe, but penalises only downside volatility — the std dev of negative returns only.",
    good: "> 1.0 is favorable, > 2.0 is excellent. More relevant than Sharpe for asymmetric return profiles.",
  },
  {
    key: "maxDrawdown",
    label: "Max Drawdown",
    format: "pct",
    icon: TrendingDown,
    color: "#ff3860",
    borderColor: "border-[#ff3860]/30",
    bgGlow: "rgba(255,56,96,0.05)",
    formula: "MDD = min((Pₜ − Peak) / Peak)",
    formulaDesc: "Largest historical peak-to-trough decline. Weighted average of individual asset drawdowns.",
    good: "Closer to 0% is better. Beyond −30% warrants tail-risk hedging. Beyond −50% signals extreme risk.",
  },
  {
    key: "beta",
    label: "Portfolio Beta",
    format: "dec",
    icon: AlertTriangle,
    color: "#94a3b8",
    borderColor: "border-white/10",
    bgGlow: "rgba(148,163,184,0.04)",
    formula: "β = Cov(Rₐ, Rₘ) / Var(Rₘ)",
    formulaDesc: "Sensitivity of portfolio returns relative to the S&P 500 market benchmark (SPY).",
    good: "β = 1.0 moves with the market. < 0.7 is defensive. > 1.5 amplifies market swings in both directions.",
  },
];

function fmt(val, format) {
  if (val == null || !isFinite(val)) return "—";
  return format === "pct" ? `${(val * 100).toFixed(2)}%` : val.toFixed(2);
}

// ── Glassmorphic modal overlay ────────────────────────────────────────────────
function MetricModal({ config, value, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "rgba(8,14,28,0.97)",
          backdropFilter: "blur(24px)",
          borderColor: `${config.color}30`,
          boxShadow: `0 0 60px ${config.color}18, 0 24px 64px rgba(0,0,0,0.8)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
          style={{ background: config.bgGlow }}
        >
          <div className="flex items-center gap-3">
            <config.icon className="w-5 h-5" style={{ color: config.color }} />
            <span className="text-base font-bold text-white">{config.label}</span>
            <span className="font-number text-2xl font-black ml-2" style={{ color: config.color }}>
              {fmt(value, config.format)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          {/* Formula */}
          <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
            <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest mb-3">
              Formula
            </p>
            <p className="font-mono text-base font-bold break-words whitespace-normal leading-relaxed"
              style={{ color: config.color }}>
              {config.formula}
            </p>
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed break-words whitespace-normal">
              {config.formulaDesc}
            </p>
          </div>

          {/* Interpretation */}
          <div className="rounded-xl border border-[#00ff87]/10 bg-[#00ff87]/[0.03] p-4">
            <p className="text-[9px] font-mono font-bold text-[#00ff87]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Info className="w-3 h-3" /> What&apos;s Good
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed break-words whitespace-normal">
              {config.good}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MetricsPanel({ metrics, hasAssets = false }) {
  const [selected, setSelected] = useState(null);

  const handleClick = (key) => setSelected((prev) => (prev === key ? null : key));
  const closeModal  = () => setSelected(null);

  const selectedConfig = selected ? METRIC_CONFIG.find((c) => c.key === selected) : null;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!hasAssets) {
    return (
      <section className="animate-fade-in-up">
        <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Quantitative Summary
        </h2>
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-sm font-semibold text-white/40 mb-1">No Analytics Yet</p>
          <p className="text-xs text-white/20 max-w-xs leading-relaxed">
            Select assets to generate institutional risk analytics.
          </p>
          {/* Ghost cards */}
          <div className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-3 w-full opacity-10 pointer-events-none select-none">
            {METRIC_CONFIG.map((cfg) => (
              <div key={cfg.key} className="metric-card p-4">
                <div className="h-2 w-10 bg-white/20 rounded mb-3" />
                <div className="h-7 w-14 bg-white/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!metrics) {
    return (
      <section className="animate-fade-in-up">
        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Quantitative Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {METRIC_CONFIG.map((cfg) => (
            <div key={cfg.key} className="metric-card p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded bg-white/[0.06]" />
                <div className="h-2.5 w-16 rounded bg-white/[0.06]" />
              </div>
              <div className="h-8 w-20 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Active state ──────────────────────────────────────────────────────────
  return (
    <>
      <section className="animate-fade-in-up">
        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Quantitative Summary
          <span className="text-[9px] font-normal normal-case tracking-normal text-white/20 ml-1">
            Click any metric for details
          </span>
        </h2>

        {/* 6-column card row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {METRIC_CONFIG.map((cfg) => {
            const isActive = selected === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => handleClick(cfg.key)}
                className={`metric-card p-4 text-left cursor-pointer transition-all group overflow-hidden ${
                  isActive ? `ring-1 ${cfg.borderColor} shadow-lg` : "hover:border-white/20"
                }`}
                style={isActive ? { background: cfg.bgGlow } : undefined}
              >
                {/* Label row */}
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <cfg.icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-none truncate">
                    {cfg.label}
                  </span>
                </div>

                {/* Value — NOT truncated, allowed to wrap if very long */}
                <p className="font-number text-2xl font-black text-gray-100 leading-none mb-2 break-all">
                  {fmt(metrics[cfg.key], cfg.format)}
                </p>

                {/* Hint */}
                <div className="flex items-center gap-1 text-[8px] text-white/20 group-hover:text-white/40 transition-colors">
                  <Info className="w-2.5 h-2.5 shrink-0" />
                  <span>{isActive ? "Close" : "Details"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Glassmorphic modal overlay */}
      {selectedConfig && selected && (
        <MetricModal
          config={selectedConfig}
          value={metrics[selected]}
          onClose={closeModal}
        />
      )}
    </>
  );
}
