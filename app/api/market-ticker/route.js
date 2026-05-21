import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

export const revalidate = 86400; // Cache for 24 hours (rolling daily cycle)

export async function GET() {
  try {
    const symbols = ["^JKSE", "^GSPC", "GC=F"];
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const quote = await yahooFinance.quote(sym);
          return {
            symbol: sym,
            name: quote.shortName || quote.longName || sym,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
          };
        } catch (e) {
          return {
            symbol: sym,
            error: true,
          };
        }
      })
    );
    
    const data = results
      .filter((r) => !r.error && r.price != null)
      .map((r) => {
        let label = r.name;
        if (r.symbol === "^JKSE") label = "IHSG";
        if (r.symbol === "^GSPC") label = "S&P 500";
        if (r.symbol === "GC=F") label = "Gold (XAU/USD)";
        return { ...r, label };
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Market Ticker API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
