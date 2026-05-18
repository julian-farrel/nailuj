// ============================================================
// Mock Data Engine — Hedge Fund Client Portal
// Historical performance profiles for all asset categories
// ============================================================

export const RISK_FREE_RATE = 0.045; // 4.5%

export const ASSET_CATEGORIES = {
  indexes: {
    label: "Indexes",
    color: "#94a3b8",
    assets: ["SPY", "QQQ"],
  },
  crypto: {
    label: "Crypto",
    color: "#f59e0b",
    assets: ["BTC", "ETH"],
  },
  equities: {
    label: "Equities",
    color: "#3b82f6",
    assets: ["AAPL", "MSFT", "TSLA", "BRK.B"],
  },
  commodities: {
    label: "Commodities",
    color: "#10b981",
    assets: ["GLD", "USO"],
  },
};

// Each asset: expectedReturn, volatility, downsideDeviation, beta, maxDrawdown
export const ASSET_DATA = {
  // ---- Indexes ----
  SPY: {
    name: "S&P 500",
    ticker: "SPY",
    category: "indexes",
    expectedReturn: 0.102,
    volatility: 0.153,
    downsideDeviation: 0.108,
    beta: 1.0,
    maxDrawdown: -0.339,
    description: "Tracks the S&P 500 Index",
  },
  QQQ: {
    name: "NASDAQ 100",
    ticker: "QQQ",
    category: "indexes",
    expectedReturn: 0.145,
    volatility: 0.195,
    downsideDeviation: 0.138,
    beta: 1.15,
    maxDrawdown: -0.403,
    description: "Tracks the NASDAQ-100 Index",
  },

  // ---- Crypto ----
  BTC: {
    name: "Bitcoin",
    ticker: "BTC",
    category: "crypto",
    expectedReturn: 0.65,
    volatility: 0.72,
    downsideDeviation: 0.52,
    beta: 2.1,
    maxDrawdown: -0.77,
    description: "Digital gold — leading cryptocurrency",
  },
  ETH: {
    name: "Ethereum",
    ticker: "ETH",
    category: "crypto",
    expectedReturn: 0.55,
    volatility: 0.82,
    downsideDeviation: 0.60,
    beta: 2.4,
    maxDrawdown: -0.82,
    description: "Smart contract platform",
  },

  // ---- Equities ----
  AAPL: {
    name: "Apple Inc.",
    ticker: "AAPL",
    category: "equities",
    expectedReturn: 0.215,
    volatility: 0.27,
    downsideDeviation: 0.19,
    beta: 1.18,
    maxDrawdown: -0.395,
    description: "Consumer electronics & services giant",
  },
  MSFT: {
    name: "Microsoft Corp.",
    ticker: "MSFT",
    category: "equities",
    expectedReturn: 0.225,
    volatility: 0.255,
    downsideDeviation: 0.18,
    beta: 1.05,
    maxDrawdown: -0.375,
    description: "Enterprise software & cloud leader",
  },
  TSLA: {
    name: "Tesla Inc.",
    ticker: "TSLA",
    category: "equities",
    expectedReturn: 0.38,
    volatility: 0.58,
    downsideDeviation: 0.42,
    beta: 1.95,
    maxDrawdown: -0.73,
    description: "Electric vehicles & clean energy",
  },
  "BRK.B": {
    name: "Berkshire Hathaway",
    ticker: "BRK.B",
    category: "equities",
    expectedReturn: 0.115,
    volatility: 0.165,
    downsideDeviation: 0.115,
    beta: 0.65,
    maxDrawdown: -0.265,
    description: "Diversified conglomerate (Buffett)",
  },

  // ---- Commodities ----
  GLD: {
    name: "Gold (SPDR)",
    ticker: "GLD",
    category: "commodities",
    expectedReturn: 0.075,
    volatility: 0.155,
    downsideDeviation: 0.11,
    beta: 0.05,
    maxDrawdown: -0.285,
    description: "Physical gold-backed ETF",
  },
  USO: {
    name: "Crude Oil",
    ticker: "USO",
    category: "commodities",
    expectedReturn: 0.04,
    volatility: 0.35,
    downsideDeviation: 0.26,
    beta: 0.45,
    maxDrawdown: -0.78,
    description: "Tracks WTI Crude Oil futures",
  },
};

// Benchmark data for projection comparisons
export const BENCHMARKS = {
  SPY: { expectedReturn: 0.102, volatility: 0.153, label: "S&P 500", color: "#64748b" },
  QQQ: { expectedReturn: 0.145, volatility: 0.195, label: "NASDAQ 100", color: "#8b5cf6" },
};

// All tickers in a flat array
export const ALL_TICKERS = Object.keys(ASSET_DATA);
