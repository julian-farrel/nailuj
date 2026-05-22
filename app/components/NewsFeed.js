"use client";
import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL = 5 * 60 * 1000;

const TABS = [
  { key: "All",         label: "ALL",    color: "#94a3b8", bg: "bg-slate-500"   },
  { key: "Macro",       label: "MACRO",  color: "#a855f7", bg: "bg-purple-600"  },
  { key: "Geopolitics", label: "GEO",    color: "#f59e0b", bg: "bg-amber-500"   },
  { key: "IHSG",        label: "IHSG",   color: "#06b6d4", bg: "bg-cyan-500"    },
  { key: "Crypto",      label: "CRYPTO", color: "#22c55e", bg: "bg-green-600"   },
];

const CATEGORY_BADGE = {
  Macro:       { bg: "bg-purple-600/90",  text: "text-white", label: "MACRO"       },
  Geopolitics: { bg: "bg-amber-500/90",   text: "text-white", label: "GEOPOLITICS" },
  IHSG:        { bg: "bg-cyan-500/90",    text: "text-white", label: "IHSG"        },
  Crypto:      { bg: "bg-green-600/90",   text: "text-white", label: "CRYPTO"      },
};

const CATEGORY_DOT = {
  Macro:       "#a855f7",
  Geopolitics: "#f59e0b",
  IHSG:        "#06b6d4",
  Crypto:      "#22c55e",
};

function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsFeed() {
  const [articles,  setArticles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
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
    <aside className="flex flex-col h-screen shrink-0 border-r border-white/[0.06]"
      style={{ width: 320, minWidth: 320, background: "rgba(8,14,28,0.95)", backdropFilter: "blur(20px)" }}
    >
      <style>{`
        .nf-scroll::-webkit-scrollbar { display: none; }
        @keyframes nf-ping { 75%,100% { transform:scale(2.2); opacity:0; } }
        @keyframes nf-shimmer {
          0%   { background-position: -300px 0; }
          100% { background-position:  300px 0; }
        }
        .nf-skel {
          background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%);
          background-size:300px 100%;
          animation: nf-shimmer 1.5s ease infinite;
          border-radius:4px;
        }
        .nf-card { transition: background 0.15s; }
        .nf-card:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Live pulse */}
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-green-500 opacity-40"
                style={{ animation: "nf-ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />
              <span className="relative w-2 h-2 rounded-full bg-green-500" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.14em] text-white/75 font-mono uppercase">
              Market Intel
            </span>
          </div>
          <div className="flex items-center gap-2">
            {fetchedAt && (
              <span className="text-[9px] text-white/25 font-mono">{timeAgo(fetchedAt)}</span>
            )}
            <button
              onClick={fetchNews}
              className="text-white/30 hover:text-white/80 transition-colors p-1 rounded"
              title="Refresh"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key !== "All" ? articles.filter((a) => a.category === tab.key).length : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-widest font-mono transition-all ${
                  isActive
                    ? "text-white border"
                    : "text-white/35 border border-white/[0.07] hover:text-white/60"
                }`}
                style={isActive ? {
                  color: tab.color,
                  borderColor: `${tab.color}55`,
                  background: `${tab.color}18`,
                } : undefined}
              >
                {tab.label}
                {count != null && count > 0 && (
                  <span className="ml-1 opacity-60 text-[8px]">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Article List ── */}
      <div className="nf-scroll flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 border border-white/[0.05] bg-white/[0.02] space-y-2">
              <div className="nf-skel h-3 w-11/12" />
              <div className="nf-skel h-3 w-8/12" />
              <div className="flex gap-2 mt-1">
                <div className="nf-skel h-4 w-14 rounded-full" />
                <div className="nf-skel h-4 w-10 rounded-full" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/25 text-xs font-mono">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Feed unavailable
          </div>
        ) : visible.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-white/20 text-xs font-mono">
            No articles
          </div>
        ) : (
          visible.map((article, idx) => {
            const badge   = CATEGORY_BADGE[article.category];
            const dotColor = CATEGORY_DOT[article.category] || "#6b7280";
            return (
              <a
                key={idx}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="nf-card block rounded-xl p-3.5 border border-white/[0.07] no-underline"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                {/* Headline */}
                <p className="text-sm font-semibold text-white leading-snug mb-2 line-clamp-2">
                  {article.title}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category badge */}
                  {badge ? (
                    <span className={`${badge.bg} ${badge.text} text-[9px] font-bold px-2 py-0.5 rounded font-mono tracking-wide`}>
                      {badge.label}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold font-mono uppercase"
                      style={{ color: dotColor }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: dotColor }} />
                      {article.category}
                    </span>
                  )}

                  {article.source && (
                    <span className="text-[9px] text-gray-400 font-mono truncate max-w-[90px]">
                      {article.source}
                    </span>
                  )}

                  <span className="text-[9px] text-gray-500 font-mono ml-auto whitespace-nowrap">
                    {timeAgo(article.pubDate)}
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2 border-t border-white/[0.05] shrink-0">
        <p className="text-[8.5px] text-white/20 font-mono text-center tracking-wide">
          Refreshes every 5 min · Google News RSS
        </p>
      </div>
    </aside>
  );
}
