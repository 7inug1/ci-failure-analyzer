# 0003. 코드 언어

상태: 결정됨 (2026-11-18)

## 배경

멘토링 2회차에서 JavaScript와 TypeScript 중 하나를 고르고 이유를 말하라고 했다.
이 프로젝트의 코드는 연습 앱(할인, 장바구니)과 분석 서버(`analyzer/`)로 나뉜다.

## 결정

연습 앱은 JavaScript, 분석 서버(`analyzer/`)는 TypeScript로 한다.

## 이유

- 연습 앱은 버그 시나리오가 단순하고 멘토 가이드와 같다.
- 서버는 AI 응답과 GitHub 요청처럼 모양이 있는 데이터를 다루므로, 타입으로 모양을 정의할 수 있다.
- 내 경력이 TypeScript다.
- 폴더가 나뉘어 있어 두 언어를 섞는 비용이 작다.

## 버린 대안

- 전부 JavaScript: 서버에서 타입 검사를 못 한다.
- 전부 TypeScript: 연습 앱 설정이 늘어 실패 시나리오가 복잡해진다.

## 결과

- 서버를 만들 때 `analyzer/`에 `tsconfig.json`과 `npm run typecheck`를 추가한다.
