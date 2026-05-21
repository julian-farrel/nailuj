"use client";
import { useState, useEffect } from "react";

const CATEGORY_CONFIG = {
  FOMC:     { color: "#a855f7", bg: "rgba(168,85,247,0.12)", label: "FOMC"     },
  CPI:      { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "CPI"      },
  NFP:      { color: "#06b6d4", bg: "rgba(6,182,212,0.12)",  label: "NFP"      },
  GDP:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  label: "GDP"      },
  PCE:      { color: "#38bdf8", bg: "rgba(56,189,248,0.12)", label: "PCE"      },
  EARNINGS: { color: "#fb923c", bg: "rgba(251,146,60,0.12)", label: "EARN"     },
};

const IMPACT_DOT = {
  high:   "#f87171",
  medium: "#f59e0b",
  low:    "#94a3b8",
};

function formatDate(isoStr) {
  const d = new Date(isoStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
}

function daysFromNow(isoStr) {
  const now  = new Date();
  const then = new Date(isoStr + "T00:00:00");
  const diff = Math.round((then - now) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0)  return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
}

export default function EconomicCalendar() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => { setEvents(d.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["ALL", "FOMC", "CPI", "NFP", "GDP", "PCE", "EARNINGS"];

  const visible = events.filter((e) => {
    if (filter !== "ALL" && e.category !== filter) return false;
    if (dateFilter && e.date < dateFilter) return false;
    return true;
  });

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
        .ec-scroll::-webkit-scrollbar { display: none; }
        .ec-item { transition: background 0.12s; }
        .ec-item:hover { background: rgba(255,255,255,0.04); }
        .ec-tab { transition: all 0.15s; cursor: pointer; }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5) sepia(1) saturate(0) brightness(1.5);
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.75)", fontFamily: "monospace",
          }}>
            MACRO CALENDAR
          </span>
        </div>

        {/* Date filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "10px",
            fontFamily: "monospace",
            padding: "5px 8px",
            outline: "none",
            marginBottom: "8px",
            boxSizing: "border-box",
          }}
        />

        {/* Category tabs — horizontal scroll */}
        <div style={{
          display: "flex", gap: "3px", overflowX: "auto", scrollbarWidth: "none",
        }}>
          {categories.map((cat) => {
            const isActive = filter === cat;
            const cfg = CATEGORY_CONFIG[cat];
            const accent = cfg?.color || "#94a3b8";
            return (
              <button
                key={cat}
                className="ec-tab"
                onClick={() => setFilter(cat)}
                style={{
                  flexShrink: 0,
                  padding: "3px 7px",
                  borderRadius: "5px",
                  border: isActive
                    ? `1px solid ${accent}55`
                    : "1px solid rgba(255,255,255,0.07)",
                  background: isActive ? `${accent}15` : "transparent",
                  color: isActive ? accent : "rgba(255,255,255,0.3)",
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                {cat === "ALL" ? "ALL" : (CATEGORY_CONFIG[cat]?.label ?? cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event list */}
      <div
        className="ec-scroll"
        style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.035)",
              display: "flex", gap: "10px", alignItems: "flex-start",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                background: "rgba(255,255,255,0.05)",
                animation: "pulse 1.5s ease infinite",
              }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{
                  height: 9, width: "80%", borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  animation: "pulse 1.5s ease infinite",
                }} />
                <div style={{
                  height: 8, width: "50%", borderRadius: 3,
                  background: "rgba(255,255,255,0.04)",
                  animation: "pulse 1.5s ease infinite",
                }} />
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "160px", color: "rgba(255,255,255,0.2)",
            fontSize: "11px", fontFamily: "monospace",
          }}>
            No events
          </div>
        ) : (
          visible.map((event, idx) => {
            const cfg = CATEGORY_CONFIG[event.category] || {
              color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: event.category,
            };
            const impactColor = IMPACT_DOT[event.impact] || "#94a3b8";
            const relative    = daysFromNow(event.date);
            const isToday     = relative === "Today";
            const isTomorrow  = relative === "Tomorrow";

            return (
              <div
                key={idx}
                className="ec-item"
                style={{
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.035)",
                  background: isToday ? "rgba(168,85,247,0.05)" : undefined,
                }}
              >
                {/* Date badge */}
                <div style={{
                  width: 38, flexShrink: 0,
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}30`,
                  borderRadius: "7px",
                  padding: "5px 4px",
                  textAlign: "center",
                }}>
                  <div style={{
                    fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                    color: cfg.color, letterSpacing: "0.04em",
                  }}>
                    {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                  </div>
                  <div style={{
                    fontSize: "14px", fontFamily: "monospace", fontWeight: 800,
                    color: "rgba(255,255,255,0.85)", lineHeight: 1.1,
                  }}>
                    {new Date(event.date + "T00:00:00").getDate()}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                    <span style={{
                      fontSize: "8px", fontWeight: 700, fontFamily: "monospace",
                      color: cfg.color, letterSpacing: "0.06em",
                    }}>
                      {cfg.label}
                    </span>
                    {event.ticker && (
                      <span style={{
                        fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                        color: "rgba(255,255,255,0.45)",
                        background: "rgba(255,255,255,0.06)",
                        padding: "0px 4px", borderRadius: "3px",
                      }}>
                        {event.ticker}
                      </span>
                    )}
                    {/* Impact dot */}
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: impactColor, marginLeft: "auto",
                      flexShrink: 0, boxShadow: `0 0 4px ${impactColor}80`,
                    }} />
                  </div>

                  <p style={{
                    fontSize: "11px", fontWeight: 600,
                    color: "rgba(255,255,255,0.82)", margin: "0 0 3px",
                    lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {event.title}
                  </p>

                  <span style={{
                    fontSize: "8.5px", fontFamily: "monospace",
                    color: isToday   ? "#a855f7"
                           : isTomorrow ? "#f59e0b"
                           : "rgba(255,255,255,0.3)",
                    fontWeight: isToday || isTomorrow ? 700 : 400,
                  }}>
                    {formatDate(event.date)} · {relative}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "7px 14px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: "8.5px", color: "rgba(255,255,255,0.18)",
          fontFamily: "monospace", margin: 0, textAlign: "center",
          letterSpacing: "0.05em",
        }}>
          FOMC · CPI · NFP · GDP · PCE · Earnings
        </p>
      </div>
    </aside>
  );
}
