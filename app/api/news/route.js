import Parser from "rss-parser";
import { NextResponse } from "next/server";

const parser = new Parser({
  customFields: {
    item: [["source", "source"]],
  },
});

const FEEDS = [
  {
    category: "Macro",
    color: "#a855f7", // purple
    url: "https://news.google.com/rss/search?q=Federal+Reserve+Interest+Rates+when:1d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    category: "Geopolitics",
    color: "#f59e0b", // amber
    url: "https://news.google.com/rss/search?q=Geopolitics+Global+Economy+when:1d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    category: "IHSG",
    color: "#06b6d4", // cyan
    url: "https://news.google.com/rss/search?q=IHSG+Jakarta+Composite+Index+when:1d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    category: "Crypto",
    color: "#22c55e", // green
    url: "https://news.google.com/rss/search?q=Cryptocurrency+Bitcoin+DeFi+when:1d&hl=en-US&gl=US&ceid=US:en",
  },
];

// Cache to avoid hammering RSS feeds on every request
let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL_MS) {
      return NextResponse.json(cache, {
        headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=300" },
      });
    }

    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).map((item) => ({
          title: item.title || "",
          link: item.link || "",
          source:
            item.source?.name ||
            (item["source"] && typeof item["source"] === "object"
              ? item["source"]._ || item["source"]["$"]?.url || ""
              : item["source"] || parsed.title || ""),
          pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          category: feed.category,
          color: feed.color,
        }));
      })
    );

    const articles = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .filter((a) => a.title)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 25);

    cache = { articles, fetchedAt: new Date().toISOString() };
    cacheTime = now;

    return NextResponse.json(cache, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=300" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, articles: [] }, { status: 500 });
  }
}
