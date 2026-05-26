export const revalidate = 60;

import { NextResponse } from "next/server";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/categories";

export async function GET() {
  try {
    const res = await fetch(COINGECKO_URL, {
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

    // 1. Filter — remove null / sub-$10M volume noise
    const filtered = raw.filter(
      (s) =>
        s.volume_24h != null &&
        isFinite(s.volume_24h) &&
        s.volume_24h >= 10_000_000
    );

    // 2. Sort descending by 24h market cap change (top pumpers first)
    filtered.sort(
      (a, b) =>
        (b.market_cap_change_24h ?? -Infinity) -
        (a.market_cap_change_24h ?? -Infinity)
    );

    // 3. Top 20
    const sliced = filtered.slice(0, 20);

    // 4. Return clean shape
    const sectors = sliced.map((s) => ({
      id:                  s.id,
      name:                s.name,
      market_cap_change_24h: s.market_cap_change_24h ?? 0,
      volume_24h:          s.volume_24h,
      top_3_coins:         Array.isArray(s.top_3_coins_id)
        ? s.top_3_coins_id.slice(0, 3)
        : [],
    }));

    return NextResponse.json(
      { sectors, fetchedAt: new Date().toISOString() },
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
