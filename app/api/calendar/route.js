import { NextResponse } from "next/server";

// ── Static high-impact macro + earnings calendar ──────────────────────────────
// Dynamically builds events relative to today's date so the calendar
// stays relevant without external API calls.

function isoDate(date) {
  return date.toISOString().split("T")[0];
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function nextWeekday(date, targetDow) {
  // targetDow: 0=Sun,1=Mon,...,6=Sat
  const d = new Date(date);
  const current = d.getDay();
  const diff = (targetDow - current + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function GET() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // FOMC meetings 2025 (approx. every 6 weeks)
  const fomcDates2025 = [
    "2025-01-29", "2025-03-19", "2025-05-07",
    "2025-06-18", "2025-07-30", "2025-09-17",
    "2025-10-29", "2025-12-10",
  ];
  const fomcDates2026 = [
    "2026-01-28", "2026-03-18", "2026-04-29",
    "2026-06-10", "2026-07-29", "2026-09-16",
    "2026-10-28", "2026-12-09",
  ];
  const fomcDates = [...fomcDates2025, ...fomcDates2026];

  // CPI release days (typically 2nd or 3rd Wed of month)
  const cpiDates = [];
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(year, m, 1);
    const wed = nextWeekday(firstOfMonth, 3);
    const secondWed = addDays(wed, 7);
    cpiDates.push(isoDate(secondWed));
  }

  // NFP (Non-Farm Payrolls) — first Friday of each month
  const nfpDates = [];
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(year, m, 1);
    const fri = nextWeekday(addDays(firstOfMonth, -1), 5);
    if (fri.getMonth() === m) nfpDates.push(isoDate(fri));
    else nfpDates.push(isoDate(nextWeekday(firstOfMonth, 5)));
  }

  // GDP releases — last Thursday of Jan, Apr, Jul, Oct
  const gdpMonths = [0, 3, 6, 9];
  const gdpDates = gdpMonths.map((m) => {
    const lastDay = new Date(year, m + 1, 0);
    const d = new Date(lastDay);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    return isoDate(d);
  });

  // PCE Inflation — last Friday of Jan, Feb, Mar, Apr...
  const pceDates = [];
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0);
    const d = new Date(lastDay);
    while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
    pceDates.push(isoDate(d));
  }

  // Major earnings (fixed calendar for 2025-2026, based on historical patterns)
  const earnings = [
    { date: `${year}-01-29`, ticker: "AAPL",  name: "Apple Q1 Earnings"       },
    { date: `${year}-01-22`, ticker: "MSFT",  name: "Microsoft Q2 Earnings"   },
    { date: `${year}-01-29`, ticker: "META",  name: "Meta Q4 Earnings"        },
    { date: `${year}-02-05`, ticker: "AMZN",  name: "Amazon Q4 Earnings"      },
    { date: `${year}-02-19`, ticker: "NVDA",  name: "NVIDIA Q4 Earnings"      },
    { date: `${year}-04-24`, ticker: "MSFT",  name: "Microsoft Q3 Earnings"   },
    { date: `${year}-04-30`, ticker: "META",  name: "Meta Q1 Earnings"        },
    { date: `${year}-05-01`, ticker: "AMZN",  name: "Amazon Q1 Earnings"      },
    { date: `${year}-05-01`, ticker: "AAPL",  name: "Apple Q2 Earnings"       },
    { date: `${year}-05-28`, ticker: "NVDA",  name: "NVIDIA Q1 Earnings"      },
    { date: `${year}-07-23`, ticker: "MSFT",  name: "Microsoft Q4 Earnings"   },
    { date: `${year}-07-30`, ticker: "META",  name: "Meta Q2 Earnings"        },
    { date: `${year}-07-31`, ticker: "AMZN",  name: "Amazon Q2 Earnings"      },
    { date: `${year}-07-31`, ticker: "AAPL",  name: "Apple Q3 Earnings"       },
    { date: `${year}-08-27`, ticker: "NVDA",  name: "NVIDIA Q2 Earnings"      },
    { date: `${year}-10-22`, ticker: "MSFT",  name: "Microsoft Q1 FY26 Earnings"},
    { date: `${year}-10-29`, ticker: "META",  name: "Meta Q3 Earnings"        },
    { date: `${year}-10-30`, ticker: "AMZN",  name: "Amazon Q3 Earnings"      },
    { date: `${year}-10-30`, ticker: "AAPL",  name: "Apple Q4 Earnings"       },
    { date: `${year}-11-19`, ticker: "NVDA",  name: "NVIDIA Q3 Earnings"      },
  ];

  // Assemble macro events
  const macroEvents = [
    ...fomcDates.map((d) => ({
      date: d, type: "macro", category: "FOMC",
      title: "FOMC Rate Decision",
      impact: "high",
      description: "Federal Open Market Committee interest rate decision and statement.",
    })),
    ...cpiDates.map((d) => ({
      date: d, type: "macro", category: "CPI",
      title: "CPI Inflation Data",
      impact: "high",
      description: "US Consumer Price Index — key Fed inflation gauge.",
    })),
    ...nfpDates.map((d) => ({
      date: d, type: "macro", category: "NFP",
      title: "Non-Farm Payrolls",
      impact: "high",
      description: "Monthly US employment report from the BLS.",
    })),
    ...gdpDates.map((d) => ({
      date: d, type: "macro", category: "GDP",
      title: "GDP Growth Rate",
      impact: "medium",
      description: "Advance/revised estimate of US GDP growth.",
    })),
    ...pceDates.map((d) => ({
      date: d, type: "macro", category: "PCE",
      title: "PCE Price Index",
      impact: "medium",
      description: "Fed's preferred inflation measure — Personal Consumption Expenditures.",
    })),
    ...earnings.map((e) => ({
      date: e.date, type: "earnings", category: "EARNINGS",
      title: e.name,
      ticker: e.ticker,
      impact: "medium",
      description: `${e.name} — after market close unless noted.`,
    })),
  ];

  // Sort by date
  macroEvents.sort((a, b) => a.date.localeCompare(b.date));

  // Filter: only upcoming (from today - 1 day)
  const cutoff = isoDate(addDays(now, -1));
  const upcoming = macroEvents.filter((e) => e.date >= cutoff).slice(0, 60);

  return NextResponse.json(
    { events: upcoming, generatedAt: now.toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=3600" } }
  );
}
