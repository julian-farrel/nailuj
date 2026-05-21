"use client";
import { useMemo } from "react";
import { computePearsonMatrix } from "@/lib/analytics";

/**
 * Map a correlation value [-1, 1] to an RGB color.
 * r > 0.7  → deep red    (high positive co-movement)
 * r ≈ 0    → near black  (uncorrelated)
 * r < 0    → bright green (negative / hedge)
 */
function corrToColor(r) {
  if (r === null || r === undefined || isNaN(r)) return "rgba(30,42,70,0.6)";
  const clamped = Math.max(-1, Math.min(1, r));
  if (clamped > 0) {
    // 0 → black,  1 → deep red
    const t = clamped;
    const red   = Math.round(180 * t + 20);
    const green = Math.round(20  * (1 - t));
    const blue  = Math.round(30  * (1 - t));
    return `rgb(${red},${green},${blue})`;
  } else {
    // 0 → black,  -1 → bright green
    const t = -clamped;
    const red   = Math.round(10  * (1 - t));
    const green = Math.round(210 * t + 20);
    const blue  = Math.round(60  * t);
    return `rgb(${red},${green},${blue})`;
  }
}

function textColor(r) {
  if (r === null || isNaN(r)) return "rgba(255,255,255,0.25)";
  const abs = Math.abs(r);
  return abs > 0.35 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)";
}

export default function CorrelationMatrix({ assets, assetDailyReturns }) {
  const tickers = useMemo(() => assets.map((a) => a.ticker), [assets]);

  const matrix = useMemo(() => {
    if (!assetDailyReturns || tickers.length < 2) return null;
    return computePearsonMatrix(tickers, assetDailyReturns);
  }, [tickers, assetDailyReturns]);

  if (tickers.length < 2) return null;

  return (
    <section
      style={{
        background: "rgba(10,17,35,0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "20px",
        overflowX: "auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{
          fontSize: "13px", fontWeight: 700,
          color: "rgba(255,255,255,0.85)", margin: 0, marginBottom: "4px",
        }}>
          Cross-Asset Correlation Matrix
        </h2>
        <p style={{
          fontSize: "10px", fontFamily: "monospace",
          color: "rgba(255,255,255,0.3)", margin: 0,
        }}>
          Pearson correlation of daily returns · 1-year window
        </p>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        marginBottom: "14px", flexWrap: "wrap",
      }}>
        {[
          { color: "rgb(180,20,30)", label: "High Positive (>0.7)" },
          { color: "rgb(20,20,30)", label: "Uncorrelated (~0)", border: "1px solid rgba(255,255,255,0.15)" },
          { color: "rgb(10,210,60)",  label: "Negative (<0)" },
        ].map(({ color, label, border }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: 12, height: 12, borderRadius: 3,
              background: color, border: border || "none", flexShrink: 0,
            }} />
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              {label}
            </span>
          </span>
        ))}
      </div>

      {/* Matrix table */}
      {matrix ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
            <thead>
              <tr>
                {/* Top-left blank cell */}
                <th style={{ width: 64, padding: "4px 6px" }} />
                {tickers.map((t) => (
                  <th key={t} style={{
                    padding: "4px 6px", textAlign: "center",
                    fontSize: "9px", fontWeight: 700, fontFamily: "monospace",
                    color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickers.map((rowTicker, ri) => (
                <tr key={rowTicker}>
                  {/* Row label */}
                  <td style={{
                    padding: "4px 8px 4px 4px", textAlign: "right",
                    fontSize: "9px", fontWeight: 700, fontFamily: "monospace",
                    color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}>
                    {rowTicker}
                  </td>
                  {tickers.map((colTicker, ci) => {
                    const r = matrix[rowTicker]?.[colTicker] ?? null;
                    const isDiag = ri === ci;
                    return (
                      <td
                        key={colTicker}
                        title={`${rowTicker} / ${colTicker}: ${r !== null ? r.toFixed(4) : "N/A"}`}
                        style={{
                          padding: "2px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{
                          width: 52, height: 40,
                          borderRadius: 6,
                          background: isDiag ? "rgba(0,229,255,0.12)" : corrToColor(r),
                          border: isDiag
                            ? "1px solid rgba(0,229,255,0.3)"
                            : "1px solid rgba(255,255,255,0.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: isDiag ? "#00e5ff" : textColor(r),
                          transition: "transform 0.15s",
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          {isDiag ? "1.00" : r !== null ? r.toFixed(2) : "—"}
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
        <div style={{
          textAlign: "center", padding: "32px 0",
          color: "rgba(255,255,255,0.2)", fontSize: "12px", fontFamily: "monospace",
        }}>
          Computing correlations…
        </div>
      )}
    </section>
  );
}
