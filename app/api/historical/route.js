import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const dynamic = "force-dynamic";

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return Response.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  try {
    // Fetch 3 years of historical data for the asset
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);

    const formatDate = (d) => d.toISOString().split("T")[0];

    // Fetch asset + SPY (benchmark) in parallel
    const [assetHistory, spyHistory] = await Promise.all([
      yahooFinance.historical(ticker, {
        period1: formatDate(startDate),
        period2: formatDate(endDate),
        interval: "1d",
      }),
      yahooFinance.historical("SPY", {
        period1: formatDate(startDate),
        period2: formatDate(endDate),
        interval: "1d",
      }),
    ]);

    if (!assetHistory || assetHistory.length < 30) {
      return Response.json(
        { error: `Insufficient historical data for ${ticker}. Need at least 30 trading days.` },
        { status: 404 }
      );
    }

    // Extract closing prices as arrays of { date, close }
    const assetPrices = assetHistory
      .filter((d) => d.close != null)
      .map((d) => ({
        date: d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date).split("T")[0],
        close: d.close,
      }));

    const spyPrices = spyHistory
      .filter((d) => d.close != null)
      .map((d) => ({
        date: d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date).split("T")[0],
        close: d.close,
      }));

    return Response.json({
      ticker,
      assetPrices,
      spyPrices,
      dataPoints: assetPrices.length,
    });
  } catch (error) {
    console.error(`Historical data error for ${ticker}:`, error);
    return Response.json(
      { error: `Failed to fetch data for ${ticker}. The ticker may be invalid.` },
      { status: 500 }
    );
  }
}
