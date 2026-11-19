function applyDiscount(price, rate) {
  if (price < 0) throw new RangeError('가격은 0 이상이어야 합니다');
  if (rate < 0 || rate > 1)
    throw new RangeError('할인율은 0 이상 1 이하여야 합니다');
  return Math.floor(price * (1 - rate));
}

module.exports = { applyDiscount };
