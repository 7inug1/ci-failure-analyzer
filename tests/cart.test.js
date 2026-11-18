const { cartTotal, cartSummary, lineLabel } = require('../src/cart');

const apple = { name: '사과', price: 1000, qty: 3 };
const pear = { name: '배', price: 4500, qty: 2 };

describe('cartTotal', () => {
  test('상품 하나의 합계는 가격 x 수량', () => {
    expect(cartTotal([apple])).toBe(3000);
  });

  test('여러 상품의 합계', () => {
    expect(cartTotal([apple, pear])).toBe(12000);
  });

  test('할인율을 합계에 적용한다', () => {
    expect(cartTotal([apple, pear], 0.1)).toBe(10800);
  });

  test('빈 장바구니는 0원', () => {
    expect(cartTotal([])).toBe(0);
  });
});

describe('cartSummary', () => {
  test('할인이 없으면 합계만 보여 준다', () => {
    expect(cartSummary([apple, pear])).toBe('합계 12,000원');
  });

  test('할인이 있으면 할인율을 함께 보여 준다', () => {
    expect(cartSummary([apple, pear], 0.1)).toBe('합계 10,800원 (10% 할인)');
  });

  test('빈 장바구니는 "합계 0원"', () => {
    expect(cartSummary([])).toBe('합계 0원');
  });

  test('큰 금액도 천 단위로 끊는다', () => {
    const tv = { name: 'TV', price: 1500000, qty: 1 };
    expect(cartSummary([tv])).toBe('합계 1,500,000원');
  });
});

describe('lineLabel', () => {
  test('상품 이름과 수량, 금액을 보여 준다', () => {
    expect(lineLabel(apple)).toBe('사과 3개 3,000원');
  });

  test('수량이 1이어도 같은 모양', () => {
    expect(lineLabel({ name: '배', price: 4500, qty: 1 })).toBe(
      '배 1개 4,500원',
    );
  });

  test('금액이 크면 천 단위로 끊는다', () => {
    expect(lineLabel({ name: 'TV', price: 1500000, qty: 2 })).toBe(
      'TV 2개 3,000,000원',
    );
  });
});
