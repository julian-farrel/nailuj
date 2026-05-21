"use client";
import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_CONFIG = {
  Macro:      { color: "#a855f7", label: "MACRO" },
  Geopolitics:{ color: "#f59e0b", label: "GEO" },
  IHSG:       { color: "#06b6d4", label: "IHSG" },
  Crypto:     { color: "#22c55e", label: "CRYPTO" },
};

export default function NewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news");
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
    const interval = setInterval(fetchNews, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Pulsing live dot */}
          <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#22c55e",
                opacity: 0.5,
                animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.85)",
              fontFamily: "monospace",
            }}
          >
            MARKET INTELLIGENCE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Category legend */}
          <div style={{ display: "flex", gap: "8px" }}>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <span
                key={key}
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: cfg.color,
                  fontFamily: "monospace",
                  opacity: 0.8,
                }}
              >
                {cfg.label}
              </span>
            ))}
          </div>
          {fetchedAt && (
            <span
              style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.25)",
                fontFamily: "monospace",
              }}
            >
              {timeAgo(fetchedAt)}
            </span>
          )}
          <button
            onClick={fetchNews}
            title="Refresh"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              opacity: 0.4,
              transition: "opacity 0.2s",
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable article list */}
      <div
        style={{
          height: "420px",
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          .news-scroll::-webkit-scrollbar { display: none; }
          .news-item { transition: background 0.15s ease; }
          .news-item:hover { background: rgba(255,255,255,0.04); }
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          @keyframes shimmer {
            0% { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
          .skeleton-line {
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 400px 100%;
            animation: shimmer 1.4s ease infinite;
            border-radius: 4px;
          }
        `}</style>

        <div className="news-scroll" style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" }}>
          {loading ? (
            // Skeleton loaders
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div className="skeleton-line" style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="skeleton-line" style={{ height: 10, width: "90%" }} />
                  <div className="skeleton-line" style={{ height: 10, width: "70%" }} />
                  <div className="skeleton-line" style={{ height: 8, width: "30%" }} />
                </div>
              </div>
            ))
          ) : error ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: "8px",
                color: "rgba(255,255,255,0.3)",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Unable to fetch news</span>
            </div>
          ) : articles.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgba(255,255,255,0.2)",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              No articles found
            </div>
          ) : (
            articles.map((article, idx) => {
              const cfg = CATEGORY_CONFIG[article.category] || { color: "#6b7280", label: article.category };
              return (
                <a
                  key={idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-item"
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    padding: "11px 18px",
                    borderBottom: "1px solid rgba(255,255,255,0.035)",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  {/* Category dot */}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: cfg.color,
                      flexShrink: 0,
                      marginTop: 5,
                      boxShadow: `0 0 6px ${cfg.color}80`,
                    }}
                  />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.82)",
                        lineHeight: 1.45,
                        margin: 0,
                        marginBottom: 4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {article.title}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: cfg.color,
                          fontFamily: "monospace",
                          opacity: 0.9,
                        }}
                      >
                        {cfg.label}
                      </span>
                      {article.source && (
                        <>
                          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.18)" }}>·</span>
                          <span
                            style={{
                              fontSize: "9px",
                              color: "rgba(255,255,255,0.35)",
                              fontFamily: "monospace",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "120px",
                            }}
                          >
                            {article.source}
                          </span>
                        </>
                      )}
                      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.18)" }}>·</span>
                      <span
                        style={{
                          fontSize: "9px",
                          color: "rgba(255,255,255,0.3)",
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {timeAgo(article.pubDate)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 4 }}
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
