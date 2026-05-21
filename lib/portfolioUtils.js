// ============================================================
// Portfolio Weight Utilities — Independent (no auto-rebalance)
// Weights are fully independent; the UI enforces 100% validation.
// ============================================================

/**
 * Set one asset's weight without touching any other asset.
 * @param {Object} currentWeights - { ticker: number (0-100) }
 * @param {string} ticker
 * @param {number} newValue - clamped to [0, 100]
 * @returns {Object} Updated weights
 */
export function setWeight(currentWeights, ticker, newValue) {
  const clamped = Math.max(0, Math.min(100, Number(newValue) || 0));
  return { ...currentWeights, [ticker]: clamped };
}

/**
 * Add a new asset at 0% weight (user assigns the value themselves).
 * First asset gets 100% as a convenient default.
 * @param {Object} currentWeights
 * @param {string} newTicker
 * @returns {Object}
 */
export function addAsset(currentWeights, newTicker) {
  const existing = Object.keys(currentWeights);
  if (existing.length === 0) {
    return { [newTicker]: 100 };
  }
  return { ...currentWeights, [newTicker]: 0 };
}

/**
 * Remove an asset and leave all remaining weights unchanged.
 * @param {Object} currentWeights
 * @param {string} removeTicker
 * @returns {Object}
 */
export function removeAsset(currentWeights, removeTicker) {
  const next = { ...currentWeights };
  delete next[removeTicker];
  return next;
}

/**
 * Calculate how far the total weight deviates from 100.
 * @param {Object} weights
 * @returns {{ total: number, delta: number, isValid: boolean }}
 *   delta > 0 → over-allocated; delta < 0 → under-allocated
 */
export function getAllocationStatus(weights) {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  const delta = Math.round((total - 100) * 100) / 100;
  return { total: Math.round(total * 100) / 100, delta, isValid: delta === 0 };
}
