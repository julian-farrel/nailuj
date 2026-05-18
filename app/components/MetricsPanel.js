"use client";
import { TrendingUp, TrendingDown, Activity, BarChart3, AlertTriangle, Zap } from "lucide-react";

const METRIC_CONFIG = [
  { key: "expectedReturn", label: "Expected Return", format: "pct", icon: TrendingUp, color: "text-accent-green" },
  { key: "volatility", label: "Volatility (Risk)", format: "pct", icon: Activity, color: "text-accent-amber" },
  { key: "sharpeRatio", label: "Sharpe Ratio", format: "dec", icon: Zap, color: "text-accent" },
  { key: "sortinoRatio", label: "Sortino Ratio", format: "dec", icon: BarChart3, color: "text-accent-purple" },
  { key: "maxDrawdown", label: "Max Drawdown", format: "pct", icon: TrendingDown, color: "text-accent-red" },
  { key: "beta", label: "Portfolio Beta", format: "dec", icon: AlertTriangle, color: "text-muted-foreground" },
];

function formatValue(val, format) {
  if (format === "pct") return `${(val * 100).toFixed(2)}%`;
  return val.toFixed(2);
}

export default function MetricsPanel({ metrics }) {
  if (!metrics) return null;

  return (
    <section className="animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent" />
        Quantitative Summary
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRIC_CONFIG.map(({ key, label, format, icon: Icon, color }) => (
          <div key={key} className="metric-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
            <p className={`text-xl font-bold font-mono ${color}`}>
              {formatValue(metrics[key], format)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
