const { applyDiscount } = require('../src/price');

describe('applyDiscount', () => {
  test('10,000원에 10% 할인하면 9,000원', () => {
    expect(applyDiscount(10000, 0.1)).toBe(9000);
  });

  test('할인율이 0이면 가격이 그대로다', () => {
    expect(applyDiscount(5000, 0)).toBe(5000);
  });

  test('할인율이 1이면 0원이다', () => {
    expect(applyDiscount(5000, 1)).toBe(0);
  });

  test('1,005원에 10% 할인하면 904.5원을 반올림해 905원', () => {
    expect(applyDiscount(1005, 0.1)).toBe(905);
  });

  test('할인율이 음수이면 RangeError', () => {
    expect(() => applyDiscount(1000, -0.1)).toThrow(RangeError);
  });

  test('할인율이 1을 넘으면 RangeError', () => {
    expect(() => applyDiscount(1000, 1.1)).toThrow(RangeError);
  });

  test('가격이 음수이면 RangeError', () => {
    expect(() => applyDiscount(-1, 0.1)).toThrow(RangeError);
  });
});
