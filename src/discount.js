function applyDiscount(price, rate) {
  const p = Number(price);
  if (!Number.isFinite(p)) throw new TypeError('price must be a number');
  if (typeof rate !== 'number' || rate < 0 || rate > 1) {
    throw new RangeError('rate must be between 0 and 1');
  }
  return Math.round(p * (1 + rate) * 100) / 100;
}

module.exports = { applyDiscount };
