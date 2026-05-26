export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

// ── Config ────────────────────────────────────────────────────────────────────
const MIN_TRADE_USD  = 50_000;   // $50K minimum per trade
const MIN_USD        = 1_000_000; // $1M+ for Hyperliquid walls
const TOP_N_COINS    = 20;

const NO_STORE = { cache: "no-store" };

function safeFloat(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

// ── Binance: recent trades for a single explicit symbol ───────────────────────
// NOTE: /api/v3/trades accepts exactly ONE symbol per request.
// We make two independent calls and combine results.
async function getBinanceTrades(symbol, asset, volume24h) {
  const res = await fetch(
    `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=100`,
    NO_STORE
  );
  if (!res.ok) return [];
  const trades = await res.json();

  return trades.flatMap((t) => {
    const price    = safeFloat(t.price);
    const qty      = safeFloat(t.qty);
    const usdValue = price * qty;
    if (usdValue < MIN_TRADE_USD) return [];

    const unusualPct = volume24h > 0 ? (usdValue / volume24h) * 100 : 0;
    return [{
      id:              `BNB-${asset}-${t.id}`,
      source:          "Binance",
      asset,
      side:            t.isBuyerMaker ? "SELL" : "BUY",
      type:            "MARKET",
      price,
      qty,
      usdValue:        Math.round(usdValue),
      volume24h:       Math.round(volume24h),
      unusualActivity: unusualPct >= 1,
      unusualPct:      +unusualPct.toFixed(3),
      time:            t.time,
    }];
  });
}

// ── Hyperliquid: meta + asset contexts ───────────────────────────────────────
async function getHyperliquidMeta() {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ type: "metaAndAssetCtxs" }),
    ...NO_STORE,
  });
  if (!res.ok) throw new Error(`Hyperliquid meta: ${res.status}`);
  const [meta, ctxs] = await res.json();

  return meta.universe.map((coin, i) => {
    const ctx = ctxs[i] || {};
    return {
      coin:      coin.name,
      markPrice: safeFloat(ctx.markPx),
      volume24h: safeFloat(ctx.dayNtlVlm),
    };
  }).filter((c) => c.markPrice > 0 && c.volume24h > 0);
}

// ── Hyperliquid: L2 orderbook walls ──────────────────────────────────────────
async function getHyperliquidWalls(coin, volume24h) {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ type: "l2Book", coin }),
    ...NO_STORE,
  });
  if (!res.ok) return [];
  const data = await res.json();

  const levels = data?.levels ?? [];
  const bids   = levels[0] ?? [];
  const asks   = levels[1] ?? [];
  const now    = Date.now();

  const parseWalls = (side, rows) =>
    rows.slice(0, 10).flatMap((level) => {
      const price    = safeFloat(level.px);
      const qty      = safeFloat(level.sz);
      const usdValue = price * qty;
      if (usdValue < MIN_USD) return [];

      const unusualPct = volume24h > 0 ? (usdValue / volume24h) * 100 : 0;
      return [{
        id:              `HL-${coin}-${side}-${level.px}`,
        source:          "Hyperliquid",
        asset:           coin,
        side:            side === "BID" ? "BUY" : "SELL",
        type:            "WALL",
        price,
        qty,
        usdValue:        Math.round(usdValue),
        volume24h:       Math.round(volume24h),
        unusualActivity: unusualPct >= 1,
        unusualPct:      +unusualPct.toFixed(3),
        time:            now,
      }];
    });

  return [...parseWalls("BID", bids), ...parseWalls("ASK", asks)];
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // Phase 1: fetch Hyperliquid universe for volume-ranked coin list
    const hlCoins = await getHyperliquidMeta().catch(() => []);

    // Fixed BTC + ETH volumes from HL for Binance trade context
    const btcVol24h = hlCoins.find((c) => c.coin === "BTC")?.volume24h ?? 0;
    const ethVol24h = hlCoins.find((c) => c.coin === "ETH")?.volume24h ?? 0;

    // Phase 2: Binance BTC + ETH trades as two SEPARATE requests (one symbol each)
    // + Hyperliquid L2 walls for top coins — all in parallel
    const topHlCoins = hlCoins
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_N_COINS);

    const [btcTrades, ethTrades, ...hlWallResults] = await Promise.allSettled([
      getBinanceTrades("BTCUSDT", "BTC", btcVol24h),
      getBinanceTrades("ETHUSDT", "ETH", ethVol24h),
      ...topHlCoins.map((c) => getHyperliquidWalls(c.coin, c.volume24h)),
    ]);

    // Combine Binance BTC + ETH trades
    const binanceAlerts = [
      ...(btcTrades.status === "fulfilled" ? btcTrades.value : []),
      ...(ethTrades.status === "fulfilled" ? ethTrades.value : []),
    ].sort((a, b) => b.time - a.time); // newest first

    // Combine all Hyperliquid walls
    const hlAlerts = hlWallResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);

    // Merge, deduplicate by id, sort by usdValue descending
    const allAlerts = [...binanceAlerts, ...hlAlerts]
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 100);

    const errors = [btcTrades, ethTrades, ...hlWallResults]
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.message ?? "unknown");

    return NextResponse.json(
      {
        alerts:          allAlerts,
        topCoinsScanned: ["BTC", "ETH", ...topHlCoins.map((c) => c.coin)],
        fetchedAt:       new Date().toISOString(),
        errors,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma":        "no-cache",
          "Expires":       "0",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { alerts: [], error: err.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
