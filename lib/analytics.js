// ============================================================
// Quantitative Analytics Engine
// Pure mathematical utility functions — no UI dependencies
// ============================================================

import { ASSET_DATA, RISK_FREE_RATE, BENCHMARKS } from "./mockData";

/**
 * Calculate weighted portfolio expected annual return.
 * @param {Object} weights - { ticker: weight (0-1) }
 * @returns {number} Expected annual return
 */
export function calcExpectedReturn(weights) {
  return Object.entries(weights).reduce((sum, [ticker, w]) => {
    const asset = ASSET_DATA[ticker];
    return sum + (asset ? asset.expectedReturn * w : 0);
  }, 0);
}

/**
 * Calculate simplified portfolio volatility (weighted).
 * Uses simplified formula: sqrt(sum(wi^2 * σi^2) + sum_i!=j(wi*wj*ρ*σi*σj))
 * We assume an average pairwise correlation of 0.3 for diversification.
 * @param {Object} weights - { ticker: weight (0-1) }
 * @returns {number} Portfolio volatility (annualized)
 */
export function calcPortfolioVolatility(weights) {
  const entries = Object.entries(weights).filter(
    ([ticker]) => ASSET_DATA[ticker]
  );
  const AVG_CORRELATION = 0.3;

  let varianceSum = 0;

  for (let i = 0; i < entries.length; i++) {
    const [tickerI, wI] = entries[i];
    const sigmaI = ASSET_DATA[tickerI].volatility;

    // Diagonal terms (wi^2 * σi^2)
    varianceSum += wI * wI * sigmaI * sigmaI;

    // Cross-terms (wi * wj * ρ * σi * σj)
    for (let j = i + 1; j < entries.length; j++) {
      const [tickerJ, wJ] = entries[j];
      const sigmaJ = ASSET_DATA[tickerJ].volatility;
      varianceSum += 2 * wI * wJ * AVG_CORRELATION * sigmaI * sigmaJ;
    }
  }

  return Math.sqrt(varianceSum);
}

/**
 * Calculate weighted downside deviation.
 * @param {Object} weights - { ticker: weight (0-1) }
 * @returns {number}
 */
export function calcDownsideDeviation(weights) {
  return Object.entries(weights).reduce((sum, [ticker, w]) => {
    const asset = ASSET_DATA[ticker];
    return sum + (asset ? asset.downsideDeviation * w : 0);
  }, 0);
}

/**
 * Calculate Sharpe Ratio.
 * (Portfolio Return - Risk-Free Rate) / Portfolio Volatility
 * @param {number} expectedReturn
 * @param {number} volatility
 * @returns {number}
 */
export function calcSharpeRatio(expectedReturn, volatility) {
  if (volatility === 0) return 0;
  return (expectedReturn - RISK_FREE_RATE) / volatility;
}

/**
 * Calculate Sortino Ratio.
 * (Portfolio Return - Risk-Free Rate) / Downside Deviation
 * @param {number} expectedReturn
 * @param {number} downsideDeviation
 * @returns {number}
 */
export function calcSortinoRatio(expectedReturn, downsideDeviation) {
  if (downsideDeviation === 0) return 0;
  return (expectedReturn - RISK_FREE_RATE) / downsideDeviation;
}

/**
 * Estimate portfolio max drawdown (weighted average of individual max drawdowns).
 * @param {Object} weights - { ticker: weight (0-1) }
 * @returns {number} Negative number representing worst-case drawdown
 */
export function calcMaxDrawdown(weights) {
  return Object.entries(weights).reduce((sum, [ticker, w]) => {
    const asset = ASSET_DATA[ticker];
    return sum + (asset ? asset.maxDrawdown * w : 0);
  }, 0);
}

/**
 * Calculate weighted portfolio beta.
 * @param {Object} weights - { ticker: weight (0-1) }
 * @returns {number}
 */
export function calcPortfolioBeta(weights) {
  return Object.entries(weights).reduce((sum, [ticker, w]) => {
    const asset = ASSET_DATA[ticker];
    return sum + (asset ? asset.beta * w : 0);
  }, 0);
}

/**
 * Compute all portfolio metrics at once.
 * @param {Object} weights - { ticker: weight (0-1) }
 * @returns {Object} Complete portfolio analytics
 */
export function computePortfolioMetrics(weights) {
  const expectedReturn = calcExpectedReturn(weights);
  const volatility = calcPortfolioVolatility(weights);
  const downsideDeviation = calcDownsideDeviation(weights);
  const sharpeRatio = calcSharpeRatio(expectedReturn, volatility);
  const sortinoRatio = calcSortinoRatio(expectedReturn, downsideDeviation);
  const maxDrawdown = calcMaxDrawdown(weights);
  const beta = calcPortfolioBeta(weights);

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

/**
 * Generate compound growth projection data points.
 * Simulates month-by-month compound growth.
 * @param {number} annualReturn - Expected annual return
 * @param {number} initialInvestment - Starting capital
 * @param {number} years - Projection horizon
 * @returns {Array<{month: number, year: number, value: number}>}
 */
export function generateProjection(annualReturn, initialInvestment, years) {
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const totalMonths = years * 12;
  const data = [];

  for (let m = 0; m <= totalMonths; m++) {
    const value = initialInvestment * Math.pow(1 + monthlyReturn, m);
    data.push({
      month: m,
      year: +(m / 12).toFixed(2),
      label: m % 12 === 0 ? `Year ${m / 12}` : "",
      value: Math.round(value),
    });
  }

  return data;
}

/**
 * Generate multi-line projection data for chart overlay.
 * Returns an array of { month, portfolio, spy, qqq } objects.
 * @param {number} portfolioReturn
 * @param {number} initialInvestment
 * @param {number} years
 * @returns {Array}
 */
export function generateProjectionData(portfolioReturn, initialInvestment, years) {
  const totalMonths = years * 12;
  const monthlyPortfolio = Math.pow(1 + portfolioReturn, 1 / 12) - 1;
  const monthlySPY = Math.pow(1 + BENCHMARKS.SPY.expectedReturn, 1 / 12) - 1;
  const monthlyQQQ = Math.pow(1 + BENCHMARKS.QQQ.expectedReturn, 1 / 12) - 1;

  const data = [];

  for (let m = 0; m <= totalMonths; m++) {
    data.push({
      month: m,
      year: +(m / 12).toFixed(1),
      label: m % 12 === 0 ? `Y${m / 12}` : "",
      portfolio: Math.round(initialInvestment * Math.pow(1 + monthlyPortfolio, m)),
      spy: Math.round(initialInvestment * Math.pow(1 + monthlySPY, m)),
      qqq: Math.round(initialInvestment * Math.pow(1 + monthlyQQQ, m)),
    });
  }

  return data;
}

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
