"use client";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";
import { generateProjectionData } from "@/lib/analytics";
import { Calendar, DollarSign, TrendingUp, LineChart, AlertTriangle } from "lucide-react";

// ── Scenario config ─────────────────────────────────────────
const SCENARIOS = [
  { key: "base",   label: "Standard",          drawdown: 0,     color: null },
  { key: "2008",   label: "2008 Crisis",        drawdown: -0.35, color: "#f59e0b" },
  { key: "covid",  label: "COVID-19 Shock",     drawdown: -0.20, color: "#f87171" },
];

/**
 * Given an immediate shock (drawdown fraction applied via portfolio beta)
 * and a recovery period (12 months), generate a 1-year forward projection
 * overlay starting from the last data point of the base series.
 */
function generateStressOverlay(baseData, portfolioBeta, drawdown, annualReturn, INITIAL) {
  if (!drawdown || drawdown === 0 || !baseData.length) return [];

  const lastPoint   = baseData[baseData.length - 1];
  const startValue  = lastPoint.portfolio;
  const startMonth  = lastPoint.month;

  // Beta-adjusted shock: shock = drawdown * beta, floored at -90%
  const shock       = Math.max(drawdown * Math.min(portfolioBeta, 3), -0.9);
  const trough      = startValue * (1 + shock);

  // Months to trough: 4 months for 2008-style, 2 for COVID
  const troughMonth = Math.abs(drawdown) > 0.25 ? 4 : 2;
  // Recovery to base trajectory: assume 12 months total window
  const totalMonths = 12;

  const monthly = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const overlay  = [];

  for (let dm = 0; dm <= totalMonths; dm++) {
    let val;
    if (dm <= troughMonth) {
      // Linear drawdown to trough
      const pct = dm / troughMonth;
      val = startValue + (trough - startValue) * pct;
    } else {
      // Recovery: compound from trough
      const recoveryMonths = dm - troughMonth;
      val = trough * Math.pow(1 + monthly, recoveryMonths);
    }
    overlay.push({
      month: startMonth + dm,
      year:  +((startMonth + dm) / 12).toFixed(1),
      stress: Math.round(val),
    });
  }

  return overlay;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated/95 backdrop-blur-xl border border-border-bright rounded-xl p-3 shadow-2xl">
      <p className="text-[11px] font-mono text-muted-foreground mb-2">
        Year {payload[0]?.payload?.year}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-semibold" style={{ color: entry.color }}>
            ${entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartEmptyState() {
  return (
    <section className="glass-card p-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 opacity-40">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-base font-bold text-muted-foreground">Forward Projection</span>
        </div>
        <div className="flex gap-2">
          {["5-Year", "10-Year"].map((label) => (
            <div key={label} className="px-4 py-2 rounded-lg text-xs font-semibold border border-border bg-surface-elevated text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-[300px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 flex items-end px-4 pb-8 gap-[3%] opacity-[0.06] pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-accent"
              style={{ height: `${(20 + Math.sin(i * 0.5) * 15 + i * 3).toFixed(4)}%` }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border/50 flex items-center justify-center mx-auto mb-4">
            <LineChart className="w-7 h-7 text-muted/25" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">No Projection Available</p>
          <p className="text-xs text-muted/50 max-w-xs mx-auto leading-relaxed">
            Search and select assets above to construct your portfolio and generate institutional risk analytics.
          </p>
          <div className="mt-5 flex items-center justify-center gap-6 opacity-30">
            {[
              { color: "#00e5ff", label: "Your Portfolio" },
              { color: "#64748b", label: "S&P 500" },
              { color: "#8b5cf6", label: "NASDAQ 100" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                <span className="w-6 h-0.5 rounded" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChartLoadingState() {
  return (
    <section className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-40 bg-muted/10 rounded animate-pulse mb-2" />
          <div className="h-3 w-56 bg-muted/10 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-9 w-20 bg-muted/10 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="h-[360px] bg-muted/5 rounded-xl animate-pulse flex items-center justify-center">
        <TrendingUp className="w-10 h-10 text-muted/10" />
      </div>
    </section>
  );
}

export default function ProjectionChart({
  portfolioReturn,
  assetMetricsMap = {},
  hasAssets = false,
}) {
  const [horizon,  setHorizon]  = useState(5);
  const [scenario, setScenario] = useState("base");
  const INITIAL = 100000;

  if (!hasAssets)           return <ChartEmptyState />;
  if (portfolioReturn == null) return <ChartLoadingState />;

  return (
    <ActiveChart
      portfolioReturn={portfolioReturn}
      assetMetricsMap={assetMetricsMap}
      horizon={horizon}
      setHorizon={setHorizon}
      scenario={scenario}
      setScenario={setScenario}
      INITIAL={INITIAL}
    />
  );
}

function ActiveChart({ portfolioReturn, assetMetricsMap, horizon, setHorizon, scenario, setScenario, INITIAL }) {
  const data = useMemo(
    () => generateProjectionData(portfolioReturn, INITIAL, horizon, assetMetricsMap),
    [portfolioReturn, horizon, assetMetricsMap, INITIAL]
  );

  const chartData = data.filter((_, i) => i % 3 === 0 || i === data.length - 1);

  // Portfolio beta for stress scaling
  const portfolioBeta = useMemo(() => {
    const entries = Object.entries(assetMetricsMap);
    if (!entries.length) return 1;
    return entries.reduce((sum, [, m]) => sum + (m.beta || 1), 0) / entries.length;
  }, [assetMetricsMap]);

  // Active scenario config
  const scenarioCfg = SCENARIOS.find((s) => s.key === scenario) || SCENARIOS[0];

  // Stress overlay: 1-year forward from end of base projection
  const stressData = useMemo(() => {
    if (scenario === "base" || !data.length) return [];
    return generateStressOverlay(data, portfolioBeta, scenarioCfg.drawdown, portfolioReturn, INITIAL);
  }, [scenario, data, portfolioBeta, scenarioCfg, portfolioReturn, INITIAL]);

  // Merge base + stress for unified chart domain
  const mergedData = useMemo(() => {
    if (!stressData.length) return chartData;
    const stressMap = Object.fromEntries(stressData.map((d) => [d.month, d.stress]));
    const existing  = new Set(chartData.map((d) => d.month));
    const extra     = stressData
      .filter((d) => !existing.has(d.month))
      .map((d) => ({ month: d.month, year: d.year }));
    const combined  = [...chartData, ...extra].sort((a, b) => a.month - b.month);
    return combined.map((d) => ({ ...d, stress: stressMap[d.month] ?? undefined }));
  }, [chartData, stressData]);

  const finalPortfolio = data[data.length - 1]?.portfolio || INITIAL;
  const finalSPY       = data[data.length - 1]?.spy  || INITIAL;
  const finalQQQ       = data[data.length - 1]?.qqq  || INITIAL;
  const portfolioGain  = (((finalPortfolio - INITIAL) / INITIAL) * 100).toFixed(1);

  // Shock label for badge
  const shockMagnitude = scenarioCfg.drawdown
    ? (scenarioCfg.drawdown * Math.min(portfolioBeta, 3) * 100).toFixed(1)
    : null;

  return (
    <section id="projection-chart" className="glass-card p-6 chart-glow animate-fade-in-up">
      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            Forward Projection
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Compound growth of $100,000 initial investment
          </p>
        </div>
        {/* Horizon toggles */}
        <div className="flex items-center gap-2">
          {[5, 10].map((y) => (
            <button
              key={y}
              onClick={() => setHorizon(y)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                horizon === y
                  ? "toggle-active"
                  : "bg-surface-elevated border-border text-muted-foreground hover:text-foreground hover:border-border-bright"
              }`}
            >
              {y}-Year
            </button>
          ))}
        </div>
      </div>

      {/* ── Scenario Analysis control bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl bg-surface-elevated/50 border border-border/40">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-1">
          Scenario
        </span>
        {SCENARIOS.map((s) => {
          const isActive = scenario === s.key;
          const accent   = s.color || "#00e5ff";
          return (
            <button
              key={s.key}
              onClick={() => setScenario(s.key)}
              style={isActive ? {
                borderColor: accent,
                color:       accent,
                background:  `${accent}20`,
                boxShadow:   `0 0 16px ${accent}30`,
              } : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                isActive
                  ? "border-current"
                  : "bg-surface-elevated border-border text-gray-300 hover:text-white hover:border-white/30"
              }`}
            >
              {s.key !== "base" && <AlertTriangle className="w-3.5 h-3.5" />}
              {s.label}
            </button>
          );
        })}

        {/* Shock magnitude badge */}
        {shockMagnitude && (
          <span
            className="ml-auto text-[10px] font-mono px-2 py-1 rounded-md border"
            style={{
              color: scenarioCfg.color,
              borderColor: `${scenarioCfg.color}40`,
              background: `${scenarioCfg.color}10`,
            }}
          >
            β-adj shock: {shockMagnitude}%
          </span>
        )}
      </div>

      {/* ── Summary badges ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border">
          <DollarSign className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-mono text-muted-foreground">Portfolio:</span>
          <span className="text-xs font-mono font-bold text-accent">${finalPortfolio.toLocaleString()}</span>
          <span className="text-[10px] font-mono text-accent-green">(+{portfolioGain}%)</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border">
          <span className="w-2 h-2 rounded-full bg-[#64748b]" />
          <span className="text-xs font-mono text-muted-foreground">S&P 500:</span>
          <span className="text-xs font-mono font-semibold text-[#64748b]">${finalSPY.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border">
          <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
          <span className="text-xs font-mono text-muted-foreground">NASDAQ:</span>
          <span className="text-xs font-mono font-semibold text-[#8b5cf6]">${finalQQQ.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mergedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00e5ff" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gradSPY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#64748b" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gradQQQ" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gradStress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={scenarioCfg.color || "#f59e0b"} stopOpacity={0.22} />
                <stop offset="100%" stopColor={scenarioCfg.color || "#f59e0b"} stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,90,0.4)" />
            <XAxis
              dataKey="year"
              tickFormatter={(v) => `Y${v}`}
              stroke="#475569"
              fontSize={11}
              fontFamily="JetBrains Mono"
              interval={horizon === 5 ? 3 : 7}
            />
            <YAxis
              stroke="#475569"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#e2e8f0",
                paddingTop: "14px",
              }}
            />

            {/* Base lines */}
            <Area type="monotone" dataKey="portfolio" name="Your Portfolio" stroke="#00e5ff" strokeWidth={2.5} fill="url(#gradPortfolio)" dot={false} connectNulls />
            <Area type="monotone" dataKey="spy"       name="S&P 500"        stroke="#64748b" strokeWidth={1.5} fill="url(#gradSPY)"       dot={false} strokeDasharray="6 3" connectNulls />
            <Area type="monotone" dataKey="qqq"       name="NASDAQ 100"     stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gradQQQ)"       dot={false} strokeDasharray="4 4" connectNulls />

            {/* Stress overlay */}
            {scenario !== "base" && (
              <Area
                type="monotone"
                dataKey="stress"
                name={`${scenarioCfg.label} Scenario`}
                stroke={scenarioCfg.color}
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#gradStress)"
                dot={false}
                connectNulls
              />
            )}

            {/* Vertical separator at horizon end */}
            {scenario !== "base" && (
              <ReferenceLine
                x={horizon}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 3"
                label={{ value: "Shock →", fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
