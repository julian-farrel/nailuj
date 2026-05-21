"use client";
import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL = 5 * 60 * 1000;

const TABS = [
  { key: "All",        label: "ALL",        color: "#94a3b8" },
  { key: "Macro",      label: "MACRO",      color: "#a855f7" },
  { key: "Geopolitics",label: "GEO",        color: "#f59e0b" },
  { key: "IHSG",       label: "IHSG",       color: "#06b6d4" },
  { key: "Crypto",     label: "CRYPTO",     color: "#22c55e" },
];

const CATEGORY_COLOR = {
  Macro:       "#a855f7",
  Geopolitics: "#f59e0b",
  IHSG:        "#06b6d4",
  Crypto:      "#22c55e",
};

function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NewsFeed() {
  const [articles, setArticles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [activeTab, setActiveTab] = useState("All");

  const fetchNews = useCallback(async () => {
    try {
      const res  = await fetch("/api/news");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch news");
      setArticles(data.articles || []);
      setFetchedAt(data.fetchedAt);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const id = setInterval(fetchNews, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNews]);

  const visible = activeTab === "All"
    ? articles
    : articles.filter((a) => a.category === activeTab);

  return (
    <aside
      style={{
        width: "320px",
        minWidth: "320px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(8,14,28,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        .nf-scroll::-webkit-scrollbar { display: none; }
        .nf-item { transition: background 0.15s; cursor: pointer; }
        .nf-item:hover { background: rgba(255,255,255,0.04); }
        .nf-tab { transition: color 0.15s, border-color 0.15s, background 0.15s; }
        @keyframes nf-ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes nf-shimmer {
          0%   { background-position: -300px 0; }
          100% { background-position:  300px 0; }
        }
        .nf-skel {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 300px 100%;
          animation: nf-shimmer 1.5s ease infinite;
          border-radius: 3px;
        }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          padding: "16px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Live dot */}
            <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7 }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#22c55e", opacity: 0.45,
                animation: "nf-ping 1.6s cubic-bezier(0,0,0.2,1) infinite",
              }} />
              <span style={{
                position: "relative", width: 7, height: 7,
                borderRadius: "50%", background: "#22c55e",
                display: "inline-flex",
              }} />
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.75)", fontFamily: "monospace",
            }}>
              MARKET INTEL
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {fetchedAt && (
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
                {timeAgo(fetchedAt)} ago
              </span>
            )}
            <button
              onClick={fetchNews}
              title="Refresh"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "3px", color: "rgba(255,255,255,0.35)",
                lineHeight: 1, transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: "4px", overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className="nf-tab"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flexShrink: 0,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: isActive
                    ? `1px solid ${tab.color}55`
                    : "1px solid rgba(255,255,255,0.07)",
                  background: isActive
                    ? `${tab.color}18`
                    : "transparent",
                  color: isActive ? tab.color : "rgba(255,255,255,0.35)",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  fontFamily: "monospace",
                  cursor: "pointer",
                }}
              >
                {tab.label}
                {tab.key !== "All" && (
                  <span style={{
                    marginLeft: "4px",
                    fontSize: "8px",
                    opacity: 0.6,
                    color: isActive ? tab.color : "rgba(255,255,255,0.25)",
                  }}>
                    {articles.filter((a) => a.category === tab.key).length || ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Article List ── */}
      <div
        className="nf-scroll"
        style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}
      >
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              padding: "11px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.035)",
              display: "flex", gap: "10px", alignItems: "flex-start",
            }}>
              <div className="nf-skel" style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div className="nf-skel" style={{ height: 9, width: "92%" }} />
                <div className="nf-skel" style={{ height: 9, width: "76%" }} />
                <div className="nf-skel" style={{ height: 7, width: "38%", marginTop: 2 }} />
              </div>
            </div>
          ))
        ) : error ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "200px", gap: "8px",
            color: "rgba(255,255,255,0.25)", fontSize: "11px", fontFamily: "monospace",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Feed unavailable</span>
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "160px", color: "rgba(255,255,255,0.18)",
            fontSize: "11px", fontFamily: "monospace",
          }}>
            No articles
          </div>
        ) : (
          visible.map((article, idx) => {
            const color = CATEGORY_COLOR[article.category] || "#6b7280";
            return (
              <a
                key={idx}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="nf-item"
                style={{
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  padding: "11px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.035)",
                  textDecoration: "none",
                }}
              >
                {/* Dot */}
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: color, flexShrink: 0, marginTop: 4,
                  boxShadow: `0 0 5px ${color}70`,
                }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "11.5px", fontWeight: 500,
                    color: "rgba(255,255,255,0.8)", lineHeight: 1.45,
                    margin: "0 0 4px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {article.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      fontSize: "8.5px", fontWeight: 700,
                      letterSpacing: "0.08em", color, fontFamily: "monospace",
                    }}>
                      {article.category?.toUpperCase()}
                    </span>
                    {article.source && (
                      <>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>·</span>
                        <span style={{
                          fontSize: "8.5px", color: "rgba(255,255,255,0.3)",
                          fontFamily: "monospace", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px",
                        }}>
                          {article.source}
                        </span>
                      </>
                    )}
                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>·</span>
                    <span style={{
                      fontSize: "8.5px", color: "rgba(255,255,255,0.28)",
                      fontFamily: "monospace", whiteSpace: "nowrap",
                    }}>
                      {timeAgo(article.pubDate)}
                    </span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: "8.5px", color: "rgba(255,255,255,0.18)",
          fontFamily: "monospace", margin: 0, textAlign: "center",
          letterSpacing: "0.06em",
        }}>
          Refreshes every 5 min · Google News RSS
        </p>
      </div>
    </aside>
  );
}
