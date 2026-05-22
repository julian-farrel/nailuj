"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL = 10_000; // 10 seconds

function formatUSD(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)  return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const ASSET_CONFIG = {
  BTC: { color: "#f7931a", label: "BTC", icon: "₿" },
  ETH: { color: "#627eea", label: "ETH", icon: "Ξ" },
};

export default function WhaleAlerts() {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const seenIds = useRef(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const res  = await fetch("/api/whale-alerts");
      const data = await res.json();
      if (!data.alerts) return;

      const newAlerts = data.alerts.filter((a) => !seenIds.current.has(a.id));
      newAlerts.forEach((a) => seenIds.current.add(a.id));

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 80));
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  return (
    <aside
      style={{
        width: "288px",
        minWidth: "288px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(8,14,28,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}
    >
      <style>{`
        .wa-scroll::-webkit-scrollbar { display: none; }
        .wa-item {
          transition: background 0.12s;
          animation: whale-slide-in 0.35s ease-out;
        }
        .wa-item:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {/* Pulsing whale dot */}
            <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#00e5ff", opacity: 0.45,
                animation: "whale-ping 2s cubic-bezier(0,0,0.2,1) infinite",
              }} />
              <span style={{
                position: "relative", width: 8, height: 8,
                borderRadius: "50%", background: "#00e5ff",
                display: "inline-flex",
              }} />
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.75)", fontFamily: "monospace",
            }}>
              WHALE ALERTS
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              fontSize: "8px", fontFamily: "monospace", fontWeight: 600,
              color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em",
            }}>
              BINANCE TAPE
            </span>
            <span style={{
              fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
              color: "#00e5ff",
              background: "rgba(0,229,255,0.1)",
              border: "1px solid rgba(0,229,255,0.2)",
              padding: "1px 5px", borderRadius: "4px",
            }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: "6px", marginTop: "10px",
        }}>
          {(() => {
            const btcBuys  = alerts.filter((a) => a.asset === "BTC" && a.side === "BUY").length;
            const btcSells = alerts.filter((a) => a.asset === "BTC" && a.side === "SELL").length;
            const ethBuys  = alerts.filter((a) => a.asset === "ETH" && a.side === "BUY").length;
            const ethSells = alerts.filter((a) => a.asset === "ETH" && a.side === "SELL").length;
            return (
              <>
                <StatChip label="BTC" buys={btcBuys} sells={btcSells} color="#f7931a" />
                <StatChip label="ETH" buys={ethBuys} sells={ethSells} color="#627eea" />
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{
        padding: "8px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", gap: "4px", flexShrink: 0,
      }}>
        <span style={{
          fontSize: "8px", fontFamily: "monospace", fontWeight: 600,
          color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em",
          padding: "2px 6px", borderRadius: "4px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          ≥$50K
        </span>
        <span style={{
          fontSize: "8px", fontFamily: "monospace", fontWeight: 600,
          color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em",
          padding: "2px 6px", borderRadius: "4px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          BTC · ETH
        </span>
        <span style={{
          fontSize: "8px", fontFamily: "monospace", fontWeight: 600,
          color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em",
          padding: "2px 6px", borderRadius: "4px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          10s poll
        </span>
      </div>

      {/* ── Alert list ── */}
      <div
        className="wa-scroll"
        style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.035)",
              display: "flex", gap: "10px", alignItems: "center",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(255,255,255,0.06)",
              }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ height: 9, width: "70%", borderRadius: 3, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: 7, width: "40%", borderRadius: 3, background: "rgba(255,255,255,0.04)" }} />
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "200px", gap: "8px",
            color: "rgba(255,255,255,0.2)", fontSize: "11px", fontFamily: "monospace",
          }}>
            <span style={{ fontSize: "24px" }}>🐋</span>
            <span>Listening for whales…</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg  = ASSET_CONFIG[alert.asset] || { color: "#94a3b8", label: alert.asset, icon: "?" };
            const isBuy = alert.side === "BUY";
            const sideColor = isBuy ? "var(--color-positive, #00ff87)" : "var(--color-negative, #ff3860)";
            const isHuge = alert.usdValue >= 200_000;

            return (
              <div
                key={alert.id}
                className="wa-item"
                style={{
                  display: "flex", gap: "10px", alignItems: "center",
                  padding: "9px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.035)",
                  borderLeft: `2px solid ${sideColor}`,
                }}
              >
                {/* Side indicator */}
                <div style={{
                  width: 28, height: 28, borderRadius: "7px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  background: isBuy ? "rgba(0,255,135,0.1)" : "rgba(255,56,96,0.1)",
                  border: `1px solid ${isBuy ? "rgba(0,255,135,0.2)" : "rgba(255,56,96,0.2)"}`,
                  position: "relative",
                }}>
                  <span style={{
                    fontSize: "13px", fontWeight: 800, lineHeight: 1,
                    color: cfg.color,
                  }}>
                    {cfg.icon}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                    <span
                      className="font-number"
                      style={{
                        fontSize: isHuge ? "12px" : "11px",
                        fontWeight: 800,
                        color: sideColor,
                      }}
                    >
                      {isHuge ? "🚨 " : ""}{formatUSD(alert.usdValue)}
                    </span>
                    <span style={{
                      fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                    }}>
                      {cfg.label}
                    </span>
                    <span style={{
                      fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                      color: sideColor, letterSpacing: "0.06em",
                      background: isBuy ? "rgba(0,255,135,0.08)" : "rgba(255,56,96,0.08)",
                      padding: "1px 5px", borderRadius: "3px",
                    }}>
                      {alert.side}
                    </span>
                    {isHuge && (
                      <span style={{
                        fontSize: "7px", fontFamily: "monospace", fontWeight: 700,
                        color: "#f59e0b", letterSpacing: "0.04em",
                        background: "rgba(245,158,11,0.1)",
                        padding: "1px 4px", borderRadius: "3px",
                      }}>
                        HIGH VOL
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="font-number" style={{
                      fontSize: "9px", color: "rgba(255,255,255,0.3)",
                    }}>
                      @{alert.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.12)" }}>·</span>
                    <span style={{
                      fontSize: "8px", fontFamily: "monospace",
                      color: "rgba(255,255,255,0.2)",
                    }}>
                      {timeAgo(alert.time)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: "8px", color: "rgba(255,255,255,0.15)",
          fontFamily: "monospace", letterSpacing: "0.05em",
        }}>
          Binance Tape · ≥$50K · 10s
        </span>
        <span className="font-number" style={{
          fontSize: "8px", color: "rgba(255,255,255,0.15)",
        }}>
          {alerts.length} alerts
        </span>
      </div>
    </aside>
  );
}

function StatChip({ label, buys, sells, color }) {
  const total  = buys + sells;
  const buyPct = total > 0 ? Math.round((buys / total) * 100) : 50;
  return (
    <div style={{
      flex: 1,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "8px",
      padding: "6px 8px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />
        <span style={{
          fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
          color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em",
        }}>
          {label}
        </span>
      </div>
      {/* Buy/Sell ratio bar */}
      <div style={{
        height: "3px", borderRadius: "2px",
        background: "rgba(255,56,96,0.4)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: "2px",
          width: `${buyPct}%`,
          background: "var(--color-positive, #00ff87)",
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: "3px",
      }}>
        <span className="font-number" style={{
          fontSize: "8px", color: "var(--color-positive, #00ff87)",
        }}>
          {buys}B
        </span>
        <span className="font-number" style={{
          fontSize: "8px", color: "var(--color-negative, #ff3860)",
        }}>
          {sells}S
        </span>
      </div>
    </div>
  );
}
