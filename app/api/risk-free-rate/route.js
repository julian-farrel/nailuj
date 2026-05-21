import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["ripHistorical", "yahooSurvey"] });

// Cache to avoid spamming Yahoo
let cache = null;
let cacheTime = 0;
const TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < TTL) {
      return NextResponse.json(cache, { headers: { "X-Cache": "HIT" } });
    }

    // ^IRX = 13-week US Treasury Bill (annualised yield in %)
    const quote = await yf.quote("^IRX");
    const rawYield = quote?.regularMarketPrice ?? null;

    if (rawYield == null || !isFinite(rawYield)) {
      throw new Error("Invalid yield from ^IRX");
    }

    // Yahoo returns as percentage (e.g. 4.5), convert to decimal (0.045)
    const rate = rawYield / 100;
    cache = { rate, rawYield, ticker: "^IRX", fetchedAt: new Date().toISOString() };
    cacheTime = now;

    return NextResponse.json(cache, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=3600" },
    });
  } catch (err) {
    // Fallback to 4.50% if Yahoo is unavailable
    return NextResponse.json(
      { rate: 0.045, rawYield: 4.5, ticker: "^IRX", error: err.message, fallback: true },
      { status: 200 }
    );
  }
}
