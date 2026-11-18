const { formatWon } = require('../src/format');

describe('formatWon', () => {
  test('0은 "0원"', () => {
    expect(formatWon(0)).toBe('0원');
  });

  test('9000은 "9,000원"', () => {
    expect(formatWon(9000)).toBe('9,000원');
  });

  test('1234567은 "1,234,567원"', () => {
    expect(formatWon(1234567)).toBe('1,234,567원');
  });

  test('음수는 "-1,000원"', () => {
    expect(formatWon(-1000)).toBe('-1,000원');
  });

  test('소수는 반올림한다 (999.6은 "1,000원")', () => {
    expect(formatWon(999.6)).toBe('1,000원');
  });
});
