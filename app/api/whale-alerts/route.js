export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

// ── Config ───────────────────────────────────────────────────────────────────
const MIN_USD        = 1_000_000;   // $1M+ anomaly threshold
const UNUSUAL_PCT    = 0.01;        // 1% of 24h volume = unusual
const TOP_N_COINS    = 20;          // scan top 20 by volume

// ── Helpers ──────────────────────────────────────────────────────────────────
const NO_STORE = { cache: "no-store" };

function safeFloat(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

// ── Binance: get all USDT 24hr tickers ───────────────────────────────────────
async function getBinanceTickers() {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/24hr",
    NO_STORE
  );
  if (!res.ok) throw new Error(`Binance 24hr ticker: ${res.status}`);
  const tickers = await res.json();

  return tickers
    .filter((t) => t.symbol.endsWith("USDT"))
    .map((t) => ({
      symbol:    t.symbol,
      asset:     t.symbol.replace("USDT", ""),
      price:     safeFloat(t.lastPrice),
      volume24h: safeFloat(t.quoteVolume), // already in USD
    }))
    .filter((t) => t.price > 0 && t.volume24h > 0);
}

// ── Binance: recent trades for one symbol ────────────────────────────────────
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
    if (usdValue < MIN_USD) return [];

    const unusualPct = volume24h > 0 ? (usdValue / volume24h) * 100 : 0;
    return [{
      id:             `BNB-${asset}-${t.id}`,
      source:         "Binance",
      asset,
      side:           t.isBuyerMaker ? "SELL" : "BUY",
      type:           "MARKET",
      price,
      qty,
      usdValue:       Math.round(usdValue),
      volume24h:      Math.round(volume24h),
      unusualActivity: unusualPct >= 1,
      unusualPct:     +unusualPct.toFixed(3),
      time:           t.time,
    }];
  });
}

// ── Hyperliquid: meta + asset contexts (all coins) ───────────────────────────
async function getHyperliquidMeta() {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ type: "metaAndAssetCtxs" }),
    ...NO_STORE,
  });
  if (!res.ok) throw new Error(`Hyperliquid meta: ${res.status}`);
  const [meta, ctxs] = await res.json();

  // meta.universe[i] => { name, szDecimals }
  // ctxs[i]          => { markPx, dayNtlVlm, ... }
  return meta.universe.map((coin, i) => {
    const ctx = ctxs[i] || {};
    return {
      coin:      coin.name,
      markPrice: safeFloat(ctx.markPx),
      volume24h: safeFloat(ctx.dayNtlVlm), // in USD
    };
  }).filter((c) => c.markPrice > 0 && c.volume24h > 0);
}

// ── Hyperliquid: L2 orderbook for one coin ───────────────────────────────────
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
    // Phase 1: get universe + volumes from both exchanges in parallel
    const [binanceTickers, hlCoins] = await Promise.allSettled([
      getBinanceTickers(),
      getHyperliquidMeta(),
    ]).then((results) => results.map((r) => r.status === "fulfilled" ? r.value : []));

    // Merge volumes: prefer Binance, supplement with Hyperliquid
    const volumeMap = new Map();
    for (const t of binanceTickers) volumeMap.set(t.asset, { ...t, exchange: "binance" });
    for (const c of hlCoins) {
      if (!volumeMap.has(c.coin)) {
        volumeMap.set(c.coin, { asset: c.coin, symbol: `${c.coin}USDT`, price: c.markPrice, volume24h: c.volume24h, exchange: "hl" });
      }
    }

    // Top N by 24h USD volume
    const top = [...volumeMap.values()]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_N_COINS);

    // Phase 2: scan each top coin for $1M+ anomalies in parallel
    const scanResults = await Promise.allSettled(
      top.flatMap((coin) => {
        const tasks = [];
        if (coin.exchange === "binance" || volumeMap.get(coin.asset)?.exchange === "binance") {
          tasks.push(getBinanceTrades(`${coin.asset}USDT`, coin.asset, coin.volume24h));
        }
        tasks.push(getHyperliquidWalls(coin.asset, coin.volume24h));
        return tasks;
      })
    );

    const alerts = scanResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 100);

    const errors = scanResults
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.message ?? "unknown");

    return NextResponse.json(
      { alerts, topCoinsScanned: top.map((c) => c.asset), fetchedAt: new Date().toISOString(), errors },
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
