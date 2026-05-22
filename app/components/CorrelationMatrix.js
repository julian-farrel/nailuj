"use client";
import { useMemo } from "react";
import { computePearsonMatrix } from "@/lib/analytics";
import { GitMerge } from "lucide-react";

/**
 * corrToColor — maps [-1, 1] to a perceptual red/black/green scale.
 */
function corrToColor(r) {
  if (r === null || r === undefined || isNaN(r)) return "rgba(30,42,70,0.5)";
  const v = Math.max(-1, Math.min(1, r));
  if (v > 0) {
    const t     = v;
    const red   = Math.round(180 * t + 20);
    const green = Math.round(20  * (1 - t));
    const blue  = Math.round(30  * (1 - t));
    return `rgb(${red},${green},${blue})`;
  } else {
    const t     = -v;
    const red   = Math.round(10  * (1 - t));
    const green = Math.round(210 * t + 20);
    const blue  = Math.round(60  * t);
    return `rgb(${red},${green},${blue})`;
  }
}

function textColor(r) {
  if (r === null || isNaN(r)) return "rgba(255,255,255,0.2)";
  return Math.abs(r) > 0.35 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
}

const CELL_SIZE = 56; // px — controls both width and height of each cell

export default function CorrelationMatrix({ assets, assetDailyReturns }) {
  const tickers = useMemo(() => assets.map((a) => a.ticker), [assets]);

  const matrix = useMemo(() => {
    if (!assetDailyReturns || tickers.length < 2) return null;
    return computePearsonMatrix(tickers, assetDailyReturns);
  }, [tickers, assetDailyReturns]);

  if (tickers.length < 2) return null;

  return (
    <section className="glass-card p-6 animate-fade-in-up overflow-x-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-white/85 flex items-center gap-2 mb-1">
            <GitMerge className="w-4 h-4 text-cyan-400" />
            Cross-Asset Correlation Matrix
          </h2>
          <p className="text-[10px] font-mono text-white/30">
            Pearson correlation of daily returns · 1-year window
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {[
            { color: "rgb(180,20,30)", label: "> 0.7" },
            { color: "rgba(30,42,70,0.8)", label: "~0", border: "1px solid rgba(255,255,255,0.1)" },
            { color: "rgb(10,210,60)",  label: "< 0" },
          ].map(({ color, label, border }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm inline-block shrink-0"
                style={{ background: color, border: border || "none" }}
              />
              <span className="text-[9px] font-mono text-white/35">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Matrix ── */}
      {matrix ? (
        <div className="overflow-x-auto">
          {/*
            Tight table approach:
            - col widths are explicit so headers sit directly over cells
            - no extra padding pushing things apart
          */}
          <table
            className="border-separate"
            style={{ borderSpacing: 3, tableLayout: "fixed" }}
          >
            <colgroup>
              {/* Row-label column */}
              <col style={{ width: 72 }} />
              {/* Data columns */}
              {tickers.map((t) => (
                <col key={t} style={{ width: CELL_SIZE }} />
              ))}
            </colgroup>

            <thead>
              <tr>
                {/* Corner blank */}
                <th />
                {tickers.map((t) => (
                  <th
                    key={t}
                    className="text-center font-mono text-[9px] font-bold text-white/50 uppercase tracking-wider pb-1"
                    style={{ width: CELL_SIZE }}
                  >
                    {t.replace("-USD", "").replace("-USDT", "")}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tickers.map((rowTicker, ri) => (
                <tr key={rowTicker}>
                  {/* Row label */}
                  <td className="font-mono text-[9px] font-bold text-white/50 uppercase tracking-wider text-right pr-2 whitespace-nowrap">
                    {rowTicker.replace("-USD", "").replace("-USDT", "")}
                  </td>

                  {/* Cells */}
                  {tickers.map((colTicker, ci) => {
                    const r      = matrix[rowTicker]?.[colTicker] ?? null;
                    const isDiag = ri === ci;

                    return (
                      <td
                        key={colTicker}
                        title={
                          isDiag
                            ? `${rowTicker} — diagonal`
                            : `${rowTicker} / ${colTicker}: ${r !== null ? r.toFixed(4) : "N/A"}`
                        }
                        style={{ padding: 0 }}
                      >
                        <div
                          className="flex items-center justify-center font-mono font-bold transition-transform duration-150 cursor-default select-none"
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          style={{
                            width:  CELL_SIZE,
                            height: CELL_SIZE - 4,
                            borderRadius: 7,
                            fontSize: 10,
                            background: isDiag
                              ? "rgba(0,229,255,0.12)"
                              : corrToColor(r),
                            border: isDiag
                              ? "1px solid rgba(0,229,255,0.35)"
                              : "1px solid rgba(255,255,255,0.04)",
                            color: isDiag
                              ? "#00e5ff"
                              : textColor(r),
                          }}
                        >
                          {isDiag
                            ? "1.00"
                            : r !== null
                            ? r.toFixed(2)
                            : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 text-white/20 text-xs font-mono">
          Computing correlations…
        </div>
      )}

      {/* Ticker count badge */}
      <p className="mt-4 text-[9px] font-mono text-white/20">
        {tickers.length} assets · {tickers.length * tickers.length} cells · diagonal = 1.00
      </p>
    </section>
  );
}
