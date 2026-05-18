"use client";
import { ASSET_DATA, ASSET_CATEGORIES } from "@/lib/mockData";
import { Check, Plus, Minus, RotateCcw } from "lucide-react";

export default function PortfolioBuilder({ selectedAssets, weights, onToggleAsset, onWeightChange, onReset }) {
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(totalWeight - 100) < 0.01;
  const remaining = 100 - totalWeight;

  return (
    <section className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Portfolio Constructor</h2>
          <p className="text-xs text-muted-foreground mt-1">Select assets and assign allocation weights</p>
        </div>
        <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border-bright transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Allocation Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground">
            Total Allocation
          </span>
          <span className={`text-sm font-bold font-mono ${isValid ? "text-accent-green" : totalWeight > 100 ? "text-accent-red" : "text-accent-amber"}`}>
            {totalWeight.toFixed(1)}% / 100%
          </span>
        </div>
        <div className="allocation-bar">
          <div
            className="allocation-fill"
            style={{
              width: `${Math.min(totalWeight, 100)}%`,
              background: isValid
                ? "linear-gradient(90deg, #00e5ff, #00ff87)"
                : totalWeight > 100
                ? "linear-gradient(90deg, #ff3860, #ff6b6b)"
                : "linear-gradient(90deg, #ffb900, #ff8c00)",
            }}
          />
        </div>
        {!isValid && (
          <p className={`text-[11px] mt-1.5 font-mono ${totalWeight > 100 ? "text-accent-red" : "text-accent-amber"}`}>
            {totalWeight > 100 ? `Over-allocated by ${(totalWeight - 100).toFixed(1)}%` : `${remaining.toFixed(1)}% remaining to allocate`}
          </p>
        )}
        {isValid && (
          <p className="text-[11px] mt-1.5 font-mono text-accent-green flex items-center gap-1">
            <Check className="w-3 h-3" /> Portfolio fully allocated — analytics active
          </p>
        )}
      </div>

      {/* Asset Categories */}
      <div className="space-y-5">
        {Object.entries(ASSET_CATEGORIES).map(([catKey, cat]) => (
          <div key={catKey}>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: cat.color }}>
              {cat.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cat.assets.map((ticker) => {
                const asset = ASSET_DATA[ticker];
                const isSelected = selectedAssets.includes(ticker);
                const weight = weights[ticker] || 0;

                return (
                  <div
                    key={ticker}
                    className={`rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "bg-surface-elevated/80 border-border-bright"
                        : "bg-surface/40 border-border/50 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => onToggleAsset(ticker)}
                        className="flex items-center gap-2 text-left"
                      >
                        <div className={`asset-checkbox ${isSelected ? "checked" : ""}`}>
                          {isSelected && <Check className="w-3 h-3 text-background" />}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-foreground">{ticker}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">{asset.name}</span>
                        </div>
                      </button>
                      {isSelected && (
                        <span className="text-sm font-bold font-mono text-accent">
                          {weight.toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => onWeightChange(ticker, Math.max(0, weight - 5))}
                          className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-bright transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={weight}
                          onChange={(e) => onWeightChange(ticker, Number(e.target.value))}
                          className="flex-1"
                        />
                        <button
                          onClick={() => onWeightChange(ticker, Math.min(100, weight + 5))}
                          className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-bright transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={weight}
                          onChange={(e) => onWeightChange(ticker, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          className="w-16 px-2 py-1 rounded-lg bg-surface border border-border text-center text-sm font-mono text-foreground focus:outline-none focus:border-accent"
                        />
                      </div>
                    )}

                    {isSelected && (
                      <div className="flex gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                        <span>Ret: {(asset.expectedReturn * 100).toFixed(1)}%</span>
                        <span>Vol: {(asset.volatility * 100).toFixed(1)}%</span>
                        <span>β: {asset.beta.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
