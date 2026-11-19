function formatWon(amount) {
  return `${Math.round(amount).toLocaleString('ko-KR')}`;
}

module.exports = { formatWon };
