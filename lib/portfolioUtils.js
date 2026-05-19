// ============================================================
// Portfolio Weight Auto-Normalization Utilities
// Ensures weights always sum to exactly 100%
// ============================================================

/**
 * Auto-normalize portfolio weights when one asset's weight changes.
 * Proportionally adjusts all OTHER assets so the total equals 100%.
 *
 * @param {Object} currentWeights - { ticker: number (0-100) }
 * @param {string} changedTicker  - The ticker whose weight was manually changed
 * @param {number} newValue       - The new weight for changedTicker (0-100)
 * @returns {Object} New weights object summing to exactly 100
 */
export function autoNormalizeWeights(currentWeights, changedTicker, newValue) {
  const tickers = Object.keys(currentWeights);
  if (tickers.length <= 1) {
    // Only one asset → it must be 100%
    return { [changedTicker]: 100 };
  }

  // Clamp newValue between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, newValue));

  // How much weight is left for all other assets
  const remaining = 100 - clampedValue;

  // Sum of all OTHER assets' current weights
  const otherTickers = tickers.filter((t) => t !== changedTicker);
  const otherSum = otherTickers.reduce(
    (sum, t) => sum + (currentWeights[t] || 0),
    0
  );

  const newWeights = { [changedTicker]: clampedValue };

  if (otherSum === 0) {
    // All others are 0 → distribute remaining equally
    const equalShare = remaining / otherTickers.length;
    otherTickers.forEach((t) => {
      newWeights[t] = Math.round(equalShare * 100) / 100;
    });
  } else {
    // Proportionally scale each other asset
    otherTickers.forEach((t) => {
      const proportion = (currentWeights[t] || 0) / otherSum;
      newWeights[t] = Math.round(proportion * remaining * 100) / 100;
    });
  }

  // Fix rounding drift on the last ticker
  const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
  const drift = 100 - total;
  if (Math.abs(drift) > 0.001 && otherTickers.length > 0) {
    // Apply drift fix to the largest "other" ticker
    const largestOther = otherTickers.reduce((max, t) =>
      (newWeights[t] || 0) > (newWeights[max] || 0) ? t : max
    );
    newWeights[largestOther] = Math.round((newWeights[largestOther] + drift) * 100) / 100;
  }

  return newWeights;
}

/**
 * Distribute weights equally among all tickers.
 * @param {string[]} tickers
 * @returns {Object} Weights summing to 100
 */
export function distributeEqually(tickers) {
  if (tickers.length === 0) return {};
  const share = Math.floor((100 / tickers.length) * 100) / 100;
  const weights = {};
  tickers.forEach((t, i) => {
    weights[t] = share;
  });
  // Fix rounding on the first ticker
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  weights[tickers[0]] += Math.round((100 - total) * 100) / 100;
  return weights;
}

/**
 * Add a new asset and redistribute weights to include it.
 * @param {Object} currentWeights - Existing weights
 * @param {string} newTicker - The new ticker to add
 * @returns {Object} Updated weights including the new ticker, summing to 100
 */
export function addAssetAndRebalance(currentWeights, newTicker) {
  const tickers = [...Object.keys(currentWeights), newTicker];
  const count = tickers.length;

  if (count === 1) {
    return { [newTicker]: 100 };
  }

  // Give the new asset an equal share, scale down others
  const newAssetShare = Math.round((100 / count) * 100) / 100;
  const scaleFactor = (100 - newAssetShare) / 100;

  const newWeights = {};
  for (const [t, w] of Object.entries(currentWeights)) {
    newWeights[t] = Math.round(w * scaleFactor * 100) / 100;
  }
  newWeights[newTicker] = newAssetShare;

  // Fix rounding drift
  const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
  const drift = 100 - total;
  if (Math.abs(drift) > 0.001) {
    const first = Object.keys(newWeights)[0];
    newWeights[first] = Math.round((newWeights[first] + drift) * 100) / 100;
  }

  return newWeights;
}

/**
 * Remove an asset and redistribute its weight proportionally.
 * @param {Object} currentWeights
 * @param {string} removeTicker
 * @returns {Object} Updated weights without the removed ticker, summing to 100
 */
export function removeAssetAndRebalance(currentWeights, removeTicker) {
  const remaining = { ...currentWeights };
  delete remaining[removeTicker];

  const tickers = Object.keys(remaining);
  if (tickers.length === 0) return {};
  if (tickers.length === 1) return { [tickers[0]]: 100 };

  const sum = Object.values(remaining).reduce((s, v) => s + v, 0);
  if (sum === 0) {
    return distributeEqually(tickers);
  }

  const newWeights = {};
  tickers.forEach((t) => {
    newWeights[t] = Math.round(((remaining[t] / sum) * 100) * 100) / 100;
  });

  // Fix rounding
  const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
  const drift = 100 - total;
  if (Math.abs(drift) > 0.001) {
    newWeights[tickers[0]] = Math.round((newWeights[tickers[0]] + drift) * 100) / 100;
  }

  return newWeights;
}
