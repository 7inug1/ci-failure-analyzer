# ci-failure-analyzer

CI 테스트가 실패하면 AI가 로그를 읽고 원인을 PR 댓글이나 이슈로 남기는 연습 프로젝트입니다.

- 연습 앱: 할인, 장바구니 합계, 금액 표시 (일반 JavaScript, 테스트는 Jest)
- 일부러 버그를 넣는 방법: patches/ 폴더의 패치 파일
- 진행 상황: 1번 단계(저장소 셋업, 시나리오 코드) 완료

## 실행과 재현

```bash
nvm use                                # Node 20
npm ci
npm test                               # 정상: 23개 통과
npm run lint
```

일부러 실패시키기 (확인한 뒤 `git restore src`로 되돌립니다):

| 시나리오 | 명령                                                                     | 결과                 |
| -------- | ------------------------------------------------------------------------ | -------------------- |
| S1       | `git apply patches/s1-discount-floor-instead-of-round.patch && npm test` | 1개 실패, 22개 통과  |
| S2       | `git apply patches/s2-cart-export-name-typo.patch && npm test`           | 3개 실패, 20개 통과  |
| L1       | `git apply patches/l1-format-drops-won-suffix.patch && npm test`         | 12개 실패, 11개 통과 |

정답표는 `docs/answers.md`에 있습니다.
