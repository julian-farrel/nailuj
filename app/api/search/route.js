import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const dynamic = "force-dynamic";

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return Response.json({ results: [] });
  }

  try {
    const result = await yahooFinance.search(query, {
      quotesCount: 8,
      newsCount: 0,
    });

    const quotes = (result.quotes || [])
      .filter((q) => q.symbol && q.shortname)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType || "EQUITY",
        exchange: q.exchDisp || q.exchange || "",
      }));

    return Response.json({ results: quotes });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json(
      { error: "Failed to search. Try a different query.", results: [] },
      { status: 500 }
    );
  }
}
