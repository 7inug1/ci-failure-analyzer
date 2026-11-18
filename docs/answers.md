# 시나리오 정답표

AI 분석이 맞았는지 채점할 때 쓰는 정답입니다. AI의 답을 보기 전에 작성했습니다.

| 시나리오 | 패치 파일                                          | 원인                                                                              | 고칠 파일       | 실제 실패 문구                                                   |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| S1       | `patches/s1-discount-floor-instead-of-round.patch` | 할인 결과를 반올림(`Math.round`)하지 않고 내림(`Math.floor`)해서 904.5가 904가 됨 | `src/price.js`  | `Expected: 905`, `Received: 904` (테스트 1개 실패)               |
| S2       | `patches/s2-cart-export-name-typo.patch`           | `cart.js`가 내보내는 함수 이름을 `lineLable`로 잘못 적음                          | `src/cart.js`   | `TypeError: lineLabel is not a function` (테스트 3개 실패)       |
| L1       | `patches/l1-format-drops-won-suffix.patch`         | `format.js`가 금액 뒤의 `원`을 빼먹어서, 이 함수를 쓰는 모든 테스트가 실패함      | `src/format.js` | `Expected: "9,000원"`, `Received: "9,000"` 등 (테스트 12개 실패) |

채점 기준: 원인과 고칠 파일을 모두 맞히면 일치로 본다. L1은 "한 곳이 원인"이라고 묶어서 설명해야 일치로 본다.
