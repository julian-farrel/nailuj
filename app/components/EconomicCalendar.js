"use client";
import { useState, useEffect, useMemo } from "react";

const CATEGORY_CONFIG = {
  FOMC:     { color: "#a855f7", bg: "rgba(168,85,247,0.14)", label: "FOMC"   },
  CPI:      { color: "#f59e0b", bg: "rgba(245,158,11,0.14)", label: "CPI"    },
  NFP:      { color: "#06b6d4", bg: "rgba(6,182,212,0.14)",  label: "NFP"    },
  GDP:      { color: "#22c55e", bg: "rgba(34,197,94,0.14)",  label: "GDP"    },
  PCE:      { color: "#38bdf8", bg: "rgba(56,189,248,0.14)", label: "PCE"    },
  EARNINGS: { color: "#fb923c", bg: "rgba(251,146,60,0.14)", label: "EARN"   },
  CLAIMS:   { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "CLAIMS" },
  PMI:      { color: "#4ade80", bg: "rgba(74,222,128,0.1)",  label: "PMI"    },
  CONF:     { color: "#e879f9", bg: "rgba(232,121,249,0.1)", label: "CONF"   },
};

const IMPACT_COLOR = { high: "#f87171", medium: "#f59e0b", low: "#94a3b8" };
const DOW_LABELS   = ["S", "M", "T", "W", "T", "F", "S"];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCalendarGrid(year, month) {
  // month: 0-indexed
  const firstDay  = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function EconomicCalendar() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  // Local date for "today"
  const localToday = useMemo(() => {
    const t = new Date();
    return isoDate(t);
  }, []);

  const [selectedDate, setSelectedDate] = useState(null); // set after hydration

  // Prevent hydration mismatch — pick selected date client-side only
  useEffect(() => {
    setSelectedDate(localToday);
  }, [localToday]);

  const [viewYear,  setViewYear]  = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => { setEvents(d.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Set of ISO dates that have events — for dot indicators
  const eventDates = useMemo(() => {
    const s = new Set();
    events.forEach((e) => s.add(e.date));
    return s;
  }, [events]);

  // Events for selected date
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => e.date === selectedDate);
  }, [events, selectedDate]);

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <aside
      style={{
        width: "284px",
        minWidth: "284px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(8,14,28,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      <style>{`
        .ec-cal::-webkit-scrollbar { display: none; }
        .ec-day { transition: background 0.12s, transform 0.1s; cursor: pointer; }
        .ec-day:hover { background: rgba(255,255,255,0.07) !important; }
        .ec-item { transition: background 0.12s; }
        .ec-item:hover { background: rgba(255,255,255,0.04); }
        @keyframes ec-pulse { 75%,100% { transform: scale(2.2); opacity: 0; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.75)", fontFamily: "monospace",
          }}>
            MACRO CALENDAR
          </span>
        </div>

        {/* ── Month navigation ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "10px",
        }}>
          <button onClick={prevMonth} style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px", color: "rgba(255,255,255,0.5)",
            cursor: "pointer", padding: "3px 8px", fontSize: "11px", lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >‹</button>
          <span style={{
            fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.7)",
            fontFamily: "monospace", letterSpacing: "0.04em",
          }}>
            {monthLabel}
          </span>
          <button onClick={nextMonth} style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px", color: "rgba(255,255,255,0.5)",
            cursor: "pointer", padding: "3px 8px", fontSize: "11px", lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >›</button>
        </div>

        {/* ── Day-of-week labels ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px", marginBottom: "4px",
        }}>
          {DOW_LABELS.map((d, i) => (
            <div key={i} style={{
              textAlign: "center", fontSize: "8px", fontWeight: 700,
              fontFamily: "monospace", color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.06em", padding: "2px 0",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* ── Day grid ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px",
        }}>
          {grid.map((day, idx) => {
            if (!day) {
              return <div key={`e-${idx}`} />;
            }

            const cellDate = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const isToday    = cellDate === localToday;
            const isSelected = cellDate === selectedDate;
            const hasEvent   = eventDates.has(cellDate);

            return (
              <div
                key={cellDate}
                className="ec-day"
                onClick={() => setSelectedDate(cellDate)}
                style={{
                  position: "relative",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  height: "28px", borderRadius: "6px",
                  background: isSelected
                    ? "#a855f7"
                    : isToday
                    ? "rgba(168,85,247,0.18)"
                    : "transparent",
                  border: isToday && !isSelected
                    ? "1px solid rgba(168,85,247,0.4)"
                    : "1px solid transparent",
                }}
              >
                <span style={{
                  fontSize: "10px", fontWeight: isToday || isSelected ? 700 : 400,
                  fontFamily: "monospace",
                  color: isSelected
                    ? "#fff"
                    : isToday
                    ? "#a855f7"
                    : "rgba(255,255,255,0.65)",
                  lineHeight: 1,
                }}>
                  {day}
                </span>
                {/* Event indicator dot */}
                {hasEvent && !isSelected && (
                  <span style={{
                    position: "absolute", bottom: 3,
                    width: 3, height: 3, borderRadius: "50%",
                    background: "#f59e0b",
                    boxShadow: "0 0 4px #f59e0b80",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Selected date label ── */}
      {selectedDate && (
        <div style={{
          padding: "10px 14px 6px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
            color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em",
          }}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            }).toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Event list for selected date ── */}
      <div className="ec-cal" style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              padding: "11px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "flex", gap: "10px",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 7, flexShrink: 0,
                background: "rgba(255,255,255,0.06)",
              }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ height: 9, width: "75%", borderRadius: 3, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: 8, width: "50%", borderRadius: 3, background: "rgba(255,255,255,0.04)" }} />
              </div>
            </div>
          ))
        ) : dayEvents.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "32px 20px", gap: "10px",
            textAlign: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>
            <p style={{
              fontSize: "11px", color: "rgba(255,255,255,0.25)",
              fontFamily: "monospace", margin: 0, lineHeight: 1.5,
            }}>
              No economic news or<br />earnings scheduled<br />for this date.
            </p>
          </div>
        ) : (
          dayEvents.map((event) => {
            const cfg = CATEGORY_CONFIG[event.category] || {
              color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: event.category,
            };
            const impactColor = IMPACT_COLOR[event.impact] || "#94a3b8";

            return (
              <div
                key={event.id}
                className="ec-item"
                style={{
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  padding: "11px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {/* Category badge */}
                <div style={{
                  width: 36, flexShrink: 0,
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}35`,
                  borderRadius: "7px",
                  padding: "5px 3px",
                  textAlign: "center",
                }}>
                  <div style={{
                    fontSize: "7px", fontFamily: "monospace", fontWeight: 800,
                    color: cfg.color, letterSpacing: "0.02em",
                  }}>
                    {cfg.label}
                  </div>
                  {event.ticker && (
                    <div style={{
                      fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                      color: "rgba(255,255,255,0.7)", marginTop: "2px",
                    }}>
                      {event.ticker}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: "3px",
                  }}>
                    <p style={{
                      fontSize: "11px", fontWeight: 600,
                      color: "rgba(255,255,255,0.85)", margin: 0,
                      lineHeight: 1.35,
                    }}>
                      {event.title}
                    </p>
                    {/* Impact dot */}
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: impactColor, flexShrink: 0, marginLeft: "6px",
                      boxShadow: `0 0 5px ${impactColor}80`,
                    }} />
                  </div>
                  <p style={{
                    fontSize: "9px", color: "rgba(255,255,255,0.28)",
                    fontFamily: "monospace", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
        display: "flex", gap: "6px", flexWrap: "wrap",
      }}>
        {[
          { label: "High Impact",   color: "#f87171" },
          { label: "Medium Impact", color: "#f59e0b" },
          { label: "Has Event",     color: "#f59e0b", shape: "dot" },
        ].map(({ label, color, shape }) => (
          <span key={label} style={{
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "8px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace",
          }}>
            <span style={{
              width: shape === "dot" ? 5 : 8,
              height: shape === "dot" ? 5 : 4,
              borderRadius: shape === "dot" ? "50%" : "2px",
              background: color, flexShrink: 0,
            }} />
            {label}
          </span>
        ))}
      </div>
    </aside>
  );
}
