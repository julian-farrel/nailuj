"use client";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { generateProjectionData } from "@/lib/analytics";
import { Calendar, DollarSign } from "lucide-react";

function CustomTooltip({ active, payload, label }) {
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

export default function ProjectionChart({ portfolioReturn }) {
  const [horizon, setHorizon] = useState(5);
  const INITIAL = 100000;

  const data = useMemo(
    () => generateProjectionData(portfolioReturn, INITIAL, horizon),
    [portfolioReturn, horizon]
  );

  // Only show every 12th point for cleaner chart
  const chartData = data.filter((_, i) => i % 3 === 0 || i === data.length - 1);

  const finalPortfolio = data[data.length - 1]?.portfolio || INITIAL;
  const finalSPY = data[data.length - 1]?.spy || INITIAL;
  const finalQQQ = data[data.length - 1]?.qqq || INITIAL;
  const portfolioGain = ((finalPortfolio - INITIAL) / INITIAL * 100).toFixed(1);

  return (
    <section className="glass-card p-6 chart-glow animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            Forward Projection
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Compound growth of $100,000 initial investment
          </p>
        </div>
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

      {/* Summary badges */}
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

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSPY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradQQQ" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", fontFamily: "Inter", paddingTop: "12px" }}
            />
            <Area type="monotone" dataKey="portfolio" name="Your Portfolio" stroke="#00e5ff" strokeWidth={2.5} fill="url(#gradPortfolio)" dot={false} />
            <Area type="monotone" dataKey="spy" name="S&P 500" stroke="#64748b" strokeWidth={1.5} fill="url(#gradSPY)" dot={false} strokeDasharray="6 3" />
            <Area type="monotone" dataKey="qqq" name="NASDAQ 100" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gradQQQ)" dot={false} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
