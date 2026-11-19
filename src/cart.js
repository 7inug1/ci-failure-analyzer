const { applyDiscount } = require('./price');
const { formatWon } = require('./format');

function cartTotal(items, rate = 0) {
  const sum = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  return applyDiscount(sum, rate);
}

function cartSummary(items, rate = 0) {
  const total = formatWon(cartTotal(items, rate));
  if (rate > 0) return `합계 ${total} (${Math.round(rate * 100)}% 할인)`;
  return `합계 ${total}`;
}

function lineLabel(item) {
  return `${item.name} ${item.qty}개 ${formatWon(item.price * item.qty)}`;
}

module.exports = { cartTotal, cartSummary, lineLable: lineLabel };
