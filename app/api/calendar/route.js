import { NextResponse } from "next/server";

// Returns dates relative to *today* so the calendar never looks stale.
function isoDate(d) {
  return d.toISOString().split("T")[0];
}

function addDays(base, n) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Next occurrence of a given weekday (0=Sun … 6=Sat) on or after `from`.
function nextDow(from, dow) {
  const d = new Date(from);
  while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export async function GET() {
  // Use UTC midnight of today as the anchor
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const events = [];

  // ── Recurring weekly events ──────────────────────────────────────────────
  // Initial Jobless Claims — every Thursday
  const nextThurs = nextDow(today, 4);
  events.push({
    id: "ijc-0",
    date: isoDate(nextThurs),
    title: "Initial Jobless Claims",
    type: "macro",
    category: "CLAIMS",
    impact: "medium",
    description: "Weekly US unemployment insurance claims filed for the first time.",
  });
  events.push({
    id: "ijc-1",
    date: isoDate(addDays(nextThurs, 7)),
    title: "Initial Jobless Claims",
    type: "macro",
    category: "CLAIMS",
    impact: "medium",
    description: "Weekly US unemployment insurance claims filed for the first time.",
  });

  // ── Monthly high-impact events relative to today ─────────────────────────

  // FOMC Rate Decision — place 12 days out on a Wednesday (simulate 6-week cycle)
  const fomcBase = nextDow(addDays(today, 12), 3);
  events.push({
    id: "fomc-0",
    date: isoDate(fomcBase),
    title: "FOMC Rate Decision",
    type: "macro",
    category: "FOMC",
    impact: "high",
    description: "Federal Open Market Committee interest rate decision, statement, and press conference.",
  });
  // Next cycle ~6 weeks later
  events.push({
    id: "fomc-1",
    date: isoDate(addDays(fomcBase, 42)),
    title: "FOMC Rate Decision",
    type: "macro",
    category: "FOMC",
    impact: "high",
    description: "Federal Open Market Committee interest rate decision, statement, and press conference.",
  });

  // Core CPI — second Wednesday of next month approximation (today + 18–22 days)
  const cpiDate = nextDow(addDays(today, 14), 3);
  events.push({
    id: "cpi-0",
    date: isoDate(cpiDate),
    title: "Core CPI Inflation",
    type: "macro",
    category: "CPI",
    impact: "high",
    description: "US Consumer Price Index ex-food & energy — Fed's primary inflation signal.",
  });
  events.push({
    id: "cpi-1",
    date: isoDate(addDays(cpiDate, 30)),
    title: "Core CPI Inflation",
    type: "macro",
    category: "CPI",
    impact: "high",
    description: "US Consumer Price Index ex-food & energy — Fed's primary inflation signal.",
  });

  // Non-Farm Payrolls — first Friday of next month approximation
  const nfpDate = nextDow(addDays(today, 8), 5);
  events.push({
    id: "nfp-0",
    date: isoDate(nfpDate),
    title: "Non-Farm Payrolls",
    type: "macro",
    category: "NFP",
    impact: "high",
    description: "Monthly US employment report — closely tracked by the Fed for policy decisions.",
  });
  events.push({
    id: "nfp-1",
    date: isoDate(addDays(nfpDate, 30)),
    title: "Non-Farm Payrolls",
    type: "macro",
    category: "NFP",
    impact: "high",
    description: "Monthly US employment report — closely tracked by the Fed for policy decisions.",
  });

  // PCE Price Index — last Friday approx (today + 25 days)
  const pceDate = nextDow(addDays(today, 22), 5);
  events.push({
    id: "pce-0",
    date: isoDate(pceDate),
    title: "PCE Price Index",
    type: "macro",
    category: "PCE",
    impact: "high",
    description: "Personal Consumption Expenditures — the Fed's preferred inflation gauge.",
  });

  // GDP Advance Estimate — quarterly, next occurrence ~today + 35 days on a Thursday
  const gdpDate = nextDow(addDays(today, 35), 4);
  events.push({
    id: "gdp-0",
    date: isoDate(gdpDate),
    title: "GDP Growth Rate (Advance)",
    type: "macro",
    category: "GDP",
    impact: "medium",
    description: "First estimate of US GDP growth for the most recent quarter.",
  });

  // ISM Manufacturing PMI — first business day of each month
  const ismDate = nextDow(addDays(today, 5), 1);
  events.push({
    id: "ism-0",
    date: isoDate(ismDate),
    title: "ISM Manufacturing PMI",
    type: "macro",
    category: "PMI",
    impact: "medium",
    description: "Institute for Supply Management monthly survey of manufacturing activity.",
  });

  // Consumer Confidence — last Tuesday of the month
  const confDate = nextDow(addDays(today, 20), 2);
  events.push({
    id: "conf-0",
    date: isoDate(confDate),
    title: "CB Consumer Confidence",
    type: "macro",
    category: "CONF",
    impact: "medium",
    description: "Conference Board monthly survey of US consumer economic sentiment.",
  });

  // ── Earnings — scatter across next 60 days ───────────────────────────────
  const earningSchedule = [
    { offset: 1,  ticker: "NVDA", name: "NVIDIA Earnings" },
    { offset: 3,  ticker: "MSFT", name: "Microsoft Earnings" },
    { offset: 5,  ticker: "AAPL", name: "Apple Earnings" },
    { offset: 9,  ticker: "META", name: "Meta Platforms Earnings" },
    { offset: 12, ticker: "AMZN", name: "Amazon Earnings" },
    { offset: 18, ticker: "GOOG", name: "Alphabet Earnings" },
    { offset: 25, ticker: "TSLA", name: "Tesla Earnings" },
    { offset: 33, ticker: "JPM",  name: "JPMorgan Chase Earnings" },
    { offset: 40, ticker: "BRK",  name: "Berkshire Hathaway Earnings" },
    { offset: 48, ticker: "NVDA", name: "NVIDIA Earnings (Next Qtr)" },
  ];

  earningSchedule.forEach(({ offset, ticker, name }, i) => {
    // Shift to nearest weekday
    let d = addDays(today, offset);
    const dow = d.getUTCDay();
    if (dow === 0) d = addDays(d, 1); // Sun → Mon
    if (dow === 6) d = addDays(d, 2); // Sat → Mon
    events.push({
      id: `earn-${i}`,
      date: isoDate(d),
      title: name,
      ticker,
      type: "earnings",
      category: "EARNINGS",
      impact: "medium",
      description: `${name} — after market close unless otherwise noted.`,
    });
  });

  // Sort chronologically
  events.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(
    { events, generatedAt: now.toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=3600" } }
  );
}
