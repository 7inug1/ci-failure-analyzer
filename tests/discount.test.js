const { applyDiscount } = require('../src/discount');

describe('applyDiscount', () => {
  test('할인율을 적용한다', () => {
    expect(applyDiscount(100, 0.1)).toBe(90);
  });
  test('할인율 0과 1을 처리한다', () => {
    expect(applyDiscount(100, 0)).toBe(100);
    expect(applyDiscount(100, 1)).toBe(0);
  });
  test('소수 결과는 소수 둘째 자리로 반올림한다', () => {
    expect(applyDiscount(19.99, 0.15)).toBe(16.99);
  });
  test('숫자 형태의 문자열 가격도 받는다', () => {
    expect(applyDiscount('100', 0.1)).toBe(90);
  });
  test('할인율이 0~1 밖이면 RangeError', () => {
    expect(() => applyDiscount(100, 1.5)).toThrow(RangeError);
    expect(() => applyDiscount(100, -0.1)).toThrow(RangeError);
  });
  test('숫자가 아닌 가격은 TypeError', () => {
    expect(() => applyDiscount('abc', 0.1)).toThrow(TypeError);
  });
});
