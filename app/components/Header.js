"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Plus, X } from "lucide-react";

const LS_KEY = "nt_watchlist";

function useWatchlist() {
  const [tickers, setTickers] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      setTickers(Array.isArray(saved) ? saved : []);
    } catch {
      setTickers([]);
    }
    setHydrated(true);
  }, []);

  const save = useCallback((next) => {
    setTickers(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const add = useCallback((ticker) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setTickers((prev) => {
      if (prev.includes(t)) return prev;
      const next = [...prev, t];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const remove = useCallback((ticker) => {
    setTickers((prev) => {
      const next = prev.filter((t) => t !== ticker);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { tickers, add, remove, hydrated };
}

export default function Header({ riskFreeRate }) {
  const { tickers, add, remove, hydrated } = useWatchlist();
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      add(inputVal);
      setInputVal("");
    }
  };

  const rfDisplay = riskFreeRate != null
    ? `${(riskFreeRate * 100).toFixed(2)}%`
    : "4.50%";

  return (
    <header
      style={{
        height: "48px",
        background: "rgba(6,13,26,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        paddingLeft: "14px",
        paddingRight: "14px",
        gap: "12px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Logo + Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "7px",
          background: "linear-gradient(135deg, #00e5ff, #00ff87)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Activity size={13} style={{ color: "#060d1a" }} />
        </div>
        <span style={{
          fontSize: "13px", fontWeight: 800, color: "rgba(255,255,255,0.9)",
          letterSpacing: "-0.01em", fontFamily: "Inter, sans-serif",
        }}>
          Nailuj Terminal
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

      {/* Live + Rf badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <span style={{
          display: "flex", alignItems: "center", gap: "4px",
          fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
          color: "#22c55e", letterSpacing: "0.08em",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%", background: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
            animation: "pulse 2s infinite",
          }} />
          LIVE
        </span>
        <span style={{
          fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
          color: "#00e5ff", letterSpacing: "0.06em",
          background: "rgba(0,229,255,0.08)",
          border: "1px solid rgba(0,229,255,0.2)",
          padding: "2px 7px", borderRadius: "5px",
        }}>
          Rf {rfDisplay}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

      {/* Watchlist row */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        gap: "4px", overflowX: "auto", scrollbarWidth: "none",
        minWidth: 0,
      }}>
        <style>{`.wl-scroll::-webkit-scrollbar{display:none}`}</style>
        <div className="wl-scroll" style={{
          display: "flex", alignItems: "center", gap: "4px",
          overflowX: "auto", scrollbarWidth: "none", flex: 1,
        }}>
          {hydrated && tickers.map((t) => (
            <WatchlistChip key={t} ticker={t} onRemove={remove} />
          ))}
        </div>

        {/* Add input */}
        <div style={{
          display: "flex", alignItems: "center", gap: "3px",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px", overflow: "hidden",
          }}>
            <Plus size={9} style={{ color: "rgba(255,255,255,0.35)", marginLeft: "5px" }} />
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="TICKER"
              maxLength={10}
              style={{
                background: "transparent", border: "none", outline: "none",
                fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                width: "54px", padding: "3px 5px",
                letterSpacing: "0.06em",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function WatchlistChip({ ticker, onRemove }) {
  const [price, setPrice] = useState(null);
  const [chg, setChg]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/search?q=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d) => {
        const match = d.results?.find((r) => r.symbol === ticker);
        if (match && !cancelled) {
          // price is not in search; just show ticker + color if available
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticker]);

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 6px 2px 7px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "6px", flexShrink: 0,
    }}>
      <span style={{
        fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
        color: "rgba(255,255,255,0.75)", letterSpacing: "0.06em",
      }}>
        {ticker}
      </span>
      <button
        onClick={() => onRemove(ticker)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "0", lineHeight: 1, color: "rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
      >
        <X size={9} />
      </button>
    </span>
  );
}
