export const revalidate = 60;

import { NextResponse } from "next/server";

const BASE = "https://api.coingecko.com/api/v3/coins/markets";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  if (!category) {
    return NextResponse.json(
      { error: "Missing required query param: category" },
      { status: 400 }
    );
  }

  try {
    const url = `${BASE}?vs_currency=usd&category=${encodeURIComponent(category)}&order=market_cap_desc&per_page=25&page=1`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "NailujTerminal/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko error: ${res.status}` },
        { status: res.status }
      );
    }

    const raw = await res.json();

    const coins = raw.map((c) => ({
      id:                          c.id,
      symbol:                      c.symbol,
      name:                        c.name,
      image:                       c.image,
      current_price:               c.current_price,
      price_change_percentage_24h: c.price_change_percentage_24h,
      market_cap:                  c.market_cap,
      total_volume:                c.total_volume,
    }));

    return NextResponse.json(
      { coins, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
