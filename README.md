# ci-failure-analyzer

CI 테스트가 실패하면 AI가 로그를 읽고 원인을 PR 댓글이나 이슈로 남기는 연습 프로젝트입니다.

- 연습 앱: 할인, 장바구니 합계, 금액 표시 (일반 JavaScript, 테스트는 Jest)
- 일부러 버그를 넣는 방법: patches/ 폴더의 패치 파일
- 진행 상황: CI 워크플로 실패 → 분석 워크플로 → 분석 서버 → AI(OpenRouter) → PR 댓글과 이슈까지 한 번씩 동작 확인

## 실행과 재현

```bash
nvm use                                # Node 20
npm ci
npm test                               # 정상: 23개 통과
npm run lint
```

일부러 실패시키기 (확인한 뒤 `git restore src`로 되돌립니다):

| 시나리오 | 명령                                                                  | 결과                 |
| -------- | --------------------------------------------------------------------- | -------------------- |
| S1       | `git apply patches/discount-floor-instead-of-round.patch && npm test` | 1개 실패, 22개 통과  |
| S2       | `git apply patches/cart-export-name-typo.patch && npm test`           | 3개 실패, 20개 통과  |
| L1       | `git apply patches/format-drops-won-suffix.patch && npm test`         | 12개 실패, 11개 통과 |

정답표는 `docs/answers.md`에 있습니다.

## 개발 설정

- 커밋 전 비밀값 검사: `brew install gitleaks` 후 `git config core.hooksPath .githooks` (저장소를 새로 받았을 때 한 번)
- 세 층 데이터 흐름(러너, 분석 서버, OpenRouter): `docs/architecture.md`
- 런타임 비교(Node.js 대 Bun)와 선택 이유: `docs/eval/runtime-benchmark.md`, `docs/adr/0004-runtime.md`
- Claude Code: `.claude/settings.json`에 허용 명령과 거부 항목, 파일 수정 후 `npm test` 자동 실행 hook이 있고, `.claude/skills/`에 반복 절차 두 개가 있음
