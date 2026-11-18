function formatWon(amount) {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

module.exports = { formatWon };
