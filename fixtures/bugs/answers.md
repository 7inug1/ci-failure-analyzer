# 버그 정답표

AI 분석이 맞았는지 채점할 때 쓰는 정답입니다. AI 응답을 보기 전에 작성합니다.
재현 방법: 작업 브랜치에서 `git apply fixtures/bugs/<파일>.patch` 후 PR을 올리고, 확인이 끝나면 머지하지 않고 닫습니다.

## 01. 할인율 부호 오류 (`01-wrong-sign.patch`)

- 원인: `src/discount.js`의 `(1 - rate)`가 `(1 + rate)`로 바뀌어 할인이 아니라 가산됨
- 고칠 곳: `src/discount.js`의 계산식 부호
- 실패 모습: `applyDiscount(100, 0.1)`이 90 대신 110을 반환
