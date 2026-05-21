"use client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function MarketTicker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch("/api/market-ticker");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setData(json.data);
        }
      } catch (e) {
        console.error("Failed to load ticker data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTicker();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-10 border-b border-border bg-surface-elevated/40 backdrop-blur-md flex items-center justify-center">
        <span className="text-[11px] font-mono text-muted-foreground/60 animate-pulse">
          Syncing global market data...
        </span>
      </div>
    );
  }

  if (data.length === 0) return null;

  // Duplicate data multiple times to create a seamless infinite loop
  const tickerItems = [...data, ...data, ...data, ...data, ...data, ...data];

  return (
    <div className="w-full h-10 border-b border-border bg-surface-elevated/40 backdrop-blur-md overflow-hidden flex items-center relative">
      {/* Gradients for smooth fade out on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />
      
      {/* Ticker Track */}
      <div className="flex items-center gap-10 whitespace-nowrap animate-marquee">
        {tickerItems.map((item, idx) => {
          const isUp = item.changePercent > 0;
          const isDown = item.changePercent < 0;
          
          return (
            <div key={`${item.symbol}-${idx}`} className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground font-mono">
                {item.label}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                  isUp
                    ? "text-accent-green bg-accent-green/10"
                    : isDown
                    ? "text-accent-red bg-accent-red/10"
                    : "text-muted-foreground bg-white/5"
                }`}
              >
                {isUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : isDown ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {isUp ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
