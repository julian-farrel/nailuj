import { NextResponse } from "next/server";

// Cache to avoid hammering Binance on every poll
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 8_000; // 8 seconds (client polls every 10s)

const PAIRS = [
  { symbol: "BTCUSDT", asset: "BTC" },
  { symbol: "ETHUSDT", asset: "ETH" },
];

const MIN_USD = 50_000;

export async function GET() {
  const now = Date.now();

  if (cache && now - cacheTime < CACHE_TTL) {
    return NextResponse.json(cache, {
      headers: { "X-Cache": "HIT", "Cache-Control": "no-store" },
    });
  }

  try {
    const results = await Promise.allSettled(
      PAIRS.map(async ({ symbol, asset }) => {
        const res = await fetch(
          `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=100`,
          { next: { revalidate: 0 } }
        );
        if (!res.ok) throw new Error(`Binance ${symbol}: ${res.status}`);
        const trades = await res.json();

        return trades
          .map((t) => {
            const price = parseFloat(t.price);
            const qty   = parseFloat(t.qty);
            const usd   = price * qty;
            return {
              id: `${asset}-${t.id}`,
              asset,
              side: t.isBuyerMaker ? "SELL" : "BUY",
              price,
              qty,
              usdValue: Math.round(usd),
              time: t.time,
            };
          })
          .filter((t) => t.usdValue >= MIN_USD);
      })
    );

    const alerts = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort((a, b) => b.time - a.time)
      .slice(0, 50);

    cache = { alerts, fetchedAt: new Date().toISOString() };
    cacheTime = now;

    return NextResponse.json(cache, {
      headers: { "X-Cache": "MISS", "Cache-Control": "no-store" },
    });
  } catch (err) {
    // Return stale cache if available, otherwise error
    if (cache) {
      return NextResponse.json(
        { ...cache, stale: true },
        { headers: { "X-Cache": "STALE" } }
      );
    }
    return NextResponse.json(
      { alerts: [], error: err.message },
      { status: 500 }
    );
  }
}
