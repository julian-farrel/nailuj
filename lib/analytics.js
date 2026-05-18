// ============================================================
// Dynamic Quantitative Analytics Engine
// Computes all metrics from raw historical price data
// ============================================================

export const RISK_FREE_RATE = 0.045;
const TRADING_DAYS = 252;

// ─── Raw Price → Daily Returns ─────────────────────────────

/**
 * Convert an array of closing prices to daily percentage returns.
 * @param {number[]} prices - Array of daily closing prices (oldest first)
 * @returns {number[]} Array of daily returns (length = prices.length - 1)
 */
export function calcDailyReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

// ─── Statistical Helpers ───────────────────────────────────

/**
 * Arithmetic mean of an array.
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Sample standard deviation.
 * @param {number[]} arr
 * @returns {number}
 */
export function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const squaredDiffs = arr.map((v) => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / (arr.length - 1));
}

/**
 * Sample variance.
 * @param {number[]} arr
 * @returns {number}
 */
export function variance(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

/**
 * Sample covariance between two arrays.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function covariance(a, b) {
  const len = Math.min(a.length, b.length);
  if (len < 2) return 0;
  const mA = mean(a.slice(0, len));
  const mB = mean(b.slice(0, len));
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += (a[i] - mA) * (b[i] - mB);
  }
  return sum / (len - 1);
}

// ─── Individual Asset Metrics ──────────────────────────────

/**
 * Annualized expected return from daily returns.
 * @param {number[]} dailyReturns
 * @returns {number}
 */
export function calcAnnualReturn(dailyReturns) {
  return mean(dailyReturns) * TRADING_DAYS;
}

/**
 * Annualized volatility from daily returns.
 * @param {number[]} dailyReturns
 * @returns {number}
 */
export function calcAnnualVolatility(dailyReturns) {
  return stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS);
}

/**
 * Annualized downside deviation — std dev of only negative daily returns.
 * @param {number[]} dailyReturns
 * @returns {number}
 */
export function calcDownsideDeviation(dailyReturns) {
  const negative = dailyReturns.filter((r) => r < 0);
  if (negative.length < 2) return 0;
  return stdDev(negative) * Math.sqrt(TRADING_DAYS);
}

/**
 * Beta = Cov(asset, benchmark) / Var(benchmark).
 * Both arrays must be aligned by date (same-length daily returns).
 * @param {number[]} assetReturns
 * @param {number[]} benchmarkReturns
 * @returns {number}
 */
export function calcBeta(assetReturns, benchmarkReturns) {
  const varBenchmark = variance(benchmarkReturns);
  if (varBenchmark === 0) return 1;
  return covariance(assetReturns, benchmarkReturns) / varBenchmark;
}

/**
 * Max drawdown — largest peak-to-trough decline in price series.
 * @param {number[]} prices - Daily closing prices (oldest first)
 * @returns {number} Negative decimal (e.g., -0.35 for a 35% drawdown)
 */
export function calcMaxDrawdown(prices) {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
    }
    const dd = (prices[i] - peak) / peak;
    if (dd < maxDD) {
      maxDD = dd;
    }
  }
  return maxDD;
}

// ─── Full Asset Metrics from Raw Prices ────────────────────

/**
 * Compute all metrics for a single asset given its price history
 * and the SPY benchmark price history.
 * @param {number[]} assetPrices - Daily closing prices (oldest first)
 * @param {number[]} spyPrices - SPY daily closing prices (oldest first)
 * @returns {Object} All computed metrics
 */
export function computeAssetMetrics(assetPrices, spyPrices) {
  const assetReturns = calcDailyReturns(assetPrices);
  const spyReturns = calcDailyReturns(spyPrices);

  // Align returns to the shorter array (in case of date mismatches)
  const minLen = Math.min(assetReturns.length, spyReturns.length);
  const alignedAsset = assetReturns.slice(assetReturns.length - minLen);
  const alignedSpy = spyReturns.slice(spyReturns.length - minLen);

  const expectedReturn = calcAnnualReturn(alignedAsset);
  const volatility = calcAnnualVolatility(alignedAsset);
  const downsideDeviation = calcDownsideDeviation(alignedAsset);
  const beta = calcBeta(alignedAsset, alignedSpy);
  const maxDrawdown = calcMaxDrawdown(assetPrices);

  return {
    expectedReturn,
    volatility,
    downsideDeviation,
    beta,
    maxDrawdown,
  };
}

// ─── Portfolio-Level Metrics ───────────────────────────────

/**
 * Compute portfolio-level metrics from individual asset metrics and weights.
 * @param {Object} assetMetricsMap - { ticker: { expectedReturn, volatility, downsideDeviation, beta, maxDrawdown } }
 * @param {Object} weights - { ticker: weight (0-1 decimal) }
 * @returns {Object} Portfolio-level metrics
 */
export function computePortfolioMetrics(assetMetricsMap, weights) {
  const entries = Object.entries(weights).filter(
    ([ticker]) => assetMetricsMap[ticker]
  );

  if (entries.length === 0) {
    return {
      expectedReturn: 0,
      volatility: 0,
      downsideDeviation: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      beta: 0,
    };
  }

  // Weighted expected return
  const expectedReturn = entries.reduce(
    (sum, [ticker, w]) => sum + assetMetricsMap[ticker].expectedReturn * w,
    0
  );

  // Portfolio volatility with avg pairwise correlation of 0.3
  const AVG_CORRELATION = 0.3;
  let varianceSum = 0;
  for (let i = 0; i < entries.length; i++) {
    const [tickerI, wI] = entries[i];
    const sigmaI = assetMetricsMap[tickerI].volatility;
    varianceSum += wI * wI * sigmaI * sigmaI;
    for (let j = i + 1; j < entries.length; j++) {
      const [tickerJ, wJ] = entries[j];
      const sigmaJ = assetMetricsMap[tickerJ].volatility;
      varianceSum += 2 * wI * wJ * AVG_CORRELATION * sigmaI * sigmaJ;
    }
  }
  const volatility = Math.sqrt(varianceSum);

  // Weighted downside deviation
  const downsideDeviation = entries.reduce(
    (sum, [ticker, w]) => sum + assetMetricsMap[ticker].downsideDeviation * w,
    0
  );

  // Weighted max drawdown
  const maxDrawdown = entries.reduce(
    (sum, [ticker, w]) => sum + assetMetricsMap[ticker].maxDrawdown * w,
    0
  );

  // Weighted beta
  const beta = entries.reduce(
    (sum, [ticker, w]) => sum + assetMetricsMap[ticker].beta * w,
    0
  );

  // Sharpe = (Return - Rf) / Volatility
  const sharpeRatio = volatility > 0 ? (expectedReturn - RISK_FREE_RATE) / volatility : 0;

  // Sortino = (Return - Rf) / Downside Deviation
  const sortinoRatio =
    downsideDeviation > 0 ? (expectedReturn - RISK_FREE_RATE) / downsideDeviation : 0;

  return {
    expectedReturn,
    volatility,
    downsideDeviation,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    beta,
  };
}

// ─── Projection Data ───────────────────────────────────────

/**
 * Generate multi-line projection data for chart overlay.
 * Uses dynamically-computed SPY/QQQ returns from the assetMetricsMap if available,
 * otherwise falls back to historical averages.
 * @param {number} portfolioReturn
 * @param {number} initialInvestment
 * @param {number} years
 * @param {Object} [assetMetricsMap] - Optional map with SPY/QQQ metrics
 * @returns {Array}
 */
export function generateProjectionData(
  portfolioReturn,
  initialInvestment,
  years,
  assetMetricsMap = {}
) {
  const spyReturn = assetMetricsMap["SPY"]?.expectedReturn ?? 0.102;
  const qqqReturn = assetMetricsMap["QQQ"]?.expectedReturn ?? 0.145;

  const totalMonths = years * 12;
  const monthlyPortfolio = Math.pow(1 + portfolioReturn, 1 / 12) - 1;
  const monthlySPY = Math.pow(1 + spyReturn, 1 / 12) - 1;
  const monthlyQQQ = Math.pow(1 + qqqReturn, 1 / 12) - 1;

  const data = [];
  for (let m = 0; m <= totalMonths; m++) {
    data.push({
      month: m,
      year: +(m / 12).toFixed(1),
      label: m % 12 === 0 ? `Y${m / 12}` : "",
      portfolio: Math.round(
        initialInvestment * Math.pow(1 + monthlyPortfolio, m)
      ),
      spy: Math.round(initialInvestment * Math.pow(1 + monthlySPY, m)),
      qqq: Math.round(initialInvestment * Math.pow(1 + monthlyQQQ, m)),
    });
  }
  return data;
}

// ─── Research Summary Generator ────────────────────────────

/**
 * Generate dynamic research commentary based on portfolio metrics.
 * @param {Object} metrics - Result from computePortfolioMetrics
 * @returns {Object} { title, summary, bullets, riskLevel }
 */
export function generateResearchSummary(metrics) {
  const { sharpeRatio, sortinoRatio, volatility, expectedReturn, maxDrawdown, beta } = metrics;

  let riskLevel = "moderate";
  let title = "Portfolio Assessment: Balanced Risk Profile";
  const bullets = [];

  // Sharpe Ratio commentary
  if (sharpeRatio > 1.5) {
    bullets.push({
      type: "positive",
      text: `Exceptional risk-adjusted efficiency. The Sharpe Ratio of ${sharpeRatio.toFixed(2)} indicates the portfolio generates substantial excess return per unit of volatility — firmly in the top quartile of institutional allocations.`,
    });
  } else if (sharpeRatio > 1.0) {
    bullets.push({
      type: "positive",
      text: `Strong risk-adjusted returns. A Sharpe Ratio of ${sharpeRatio.toFixed(2)} suggests the portfolio effectively compensates investors for the risk undertaken — outperforming the typical 60/40 benchmark.`,
    });
  } else if (sharpeRatio > 0.5) {
    bullets.push({
      type: "neutral",
      text: `Adequate risk-adjusted performance. The Sharpe Ratio of ${sharpeRatio.toFixed(2)} is within acceptable institutional thresholds, though rebalancing toward lower-correlation assets could improve efficiency.`,
    });
  } else {
    bullets.push({
      type: "warning",
      text: `Below-threshold risk efficiency. A Sharpe Ratio of ${sharpeRatio.toFixed(2)} signals that the portfolio's return does not sufficiently compensate for its volatility. Consider reducing exposure to high-beta positions.`,
    });
  }

  // Sortino Ratio commentary
  if (sortinoRatio > 2.0) {
    bullets.push({
      type: "positive",
      text: `Superior downside risk management. The Sortino Ratio of ${sortinoRatio.toFixed(2)} demonstrates exceptional insulation against negative return deviation — the portfolio is well-structured to weather drawdowns.`,
    });
  } else if (sortinoRatio > 1.0) {
    bullets.push({
      type: "positive",
      text: `Favorable downside characteristics. A Sortino Ratio of ${sortinoRatio.toFixed(2)} indicates the portfolio's return adequately compensates for downside risk, with limited exposure to loss-generating volatility.`,
    });
  } else {
    bullets.push({
      type: "warning",
      text: `Elevated downside exposure. The Sortino Ratio of ${sortinoRatio.toFixed(2)} warrants attention — the portfolio may experience asymmetric losses during market stress events.`,
    });
  }

  // Volatility commentary
  if (volatility > 0.25) {
    riskLevel = "high";
    title = "Portfolio Assessment: Elevated Risk Profile";
    bullets.push({
      type: "warning",
      text: `⚠ HIGH VOLATILITY ALERT — Portfolio annualized volatility of ${(volatility * 100).toFixed(1)}% significantly exceeds institutional comfort zones (typically 12-18%). This is likely driven by over-exposure to high-beta assets such as cryptocurrency or speculative tech equities. Consider hedging or reducing allocation to these positions.`,
    });
  } else if (volatility > 0.18) {
    riskLevel = "elevated";
    title = "Portfolio Assessment: Moderately Elevated Risk";
    bullets.push({
      type: "neutral",
      text: `Volatility of ${(volatility * 100).toFixed(1)}% is above the institutional median. While acceptable for growth-oriented mandates, fixed-income or commodity overlays could smooth the return profile.`,
    });
  } else {
    bullets.push({
      type: "positive",
      text: `Volatility of ${(volatility * 100).toFixed(1)}% is well within institutional guidelines. The portfolio demonstrates disciplined risk management suitable for a wide range of investor mandates.`,
    });
  }

  // Max Drawdown commentary
  if (maxDrawdown < -0.5) {
    bullets.push({
      type: "warning",
      text: `Estimated maximum drawdown of ${(maxDrawdown * 100).toFixed(1)}% represents significant capital-at-risk. Tail-risk hedging strategies (e.g., protective puts, VIX overlays) are strongly recommended.`,
    });
  } else if (maxDrawdown < -0.3) {
    bullets.push({
      type: "neutral",
      text: `Max drawdown estimate of ${(maxDrawdown * 100).toFixed(1)}% is within historical norms for equity-heavy portfolios. Consider stop-loss mechanisms for drawdown control.`,
    });
  } else {
    bullets.push({
      type: "positive",
      text: `Conservative drawdown profile of ${(maxDrawdown * 100).toFixed(1)}%. Capital preservation characteristics are strong, suitable for risk-averse institutional mandates.`,
    });
  }

  // Beta commentary
  if (beta > 1.5) {
    bullets.push({
      type: "warning",
      text: `Portfolio beta of ${beta.toFixed(2)} indicates amplified market sensitivity. Returns will be magnified in both directions relative to the S&P 500 benchmark.`,
    });
  } else if (beta < 0.7) {
    bullets.push({
      type: "positive",
      text: `Low-beta profile (${beta.toFixed(2)}) provides defensive market exposure. The portfolio should demonstrate resilience during broad market corrections.`,
    });
  }

  // Overall summary sentence
  const summary =
    riskLevel === "high"
      ? `This portfolio targets an annualized return of ${(expectedReturn * 100).toFixed(1)}% with significant volatility. The risk-return tradeoff requires careful monitoring and may be unsuitable for conservative mandates.`
      : riskLevel === "elevated"
      ? `Targeting ${(expectedReturn * 100).toFixed(1)}% annual return with above-average risk. The allocation demonstrates growth conviction but could benefit from diversification adjustments.`
      : `The portfolio is positioned for ${(expectedReturn * 100).toFixed(1)}% annualized growth with well-managed risk parameters. Overall construction aligns with institutional best practices.`;

  return { title, summary, bullets, riskLevel };
}
