# 0001. 분석에 쓸 LLM 모델

상태: 변경됨 (2026-11-19, 아래 "변경" 참고)

## 배경

OpenRouter 무료(`:free`) 모델 중 structured outputs를 지원하는 모델이 필요하다.
조회한 시점(2026-11-11)에 조건에 맞는 모델은 4개였다.

## 결정

`nvidia/nemotron-3.5-super-vl:free`

## 이유

- JSON 스키마 응답 시험을 통과했다.
- 나머지 후보 둘은 1.7B와 2.6B급이라 원인 분석 정확도가 걱정된다.

## 알려진 점

- 한 줄짜리 질문에도 추론 토큰을 231개 썼다. 응답이 느릴 수 있다.
- Privacy에서 무료 모델 학습 허용을 끈 뒤에도 호출이 성공했다.
- 모델은 `analyzer/.env`의 `LLM_MODEL`만 바꾸면 교체된다.
- 모델 비교 결과는 `docs/eval/results.md`에 기록한다.

## 변경 (2026-11-19)

- `nvidia/nemotron-3.5-super-vl:free`가 HTTP 404로 실패했다. 응답 본문의 사유는 "Free model training violation (account settings)", 즉 계정에서 "무료 모델이 입력을 학습에 쓰는 것"을 허용하지 않게 해 둔 설정 때문에 이 모델의 연결 지점이 제외된 것이다.
- 설정을 바꾸지 않고(로그가 학습에 쓰이지 않게 하는 것이 우선), 같은 조건(JSON 스키마 응답 지원)의 다른 무료 모델을 같은 실패 로그로 비교했다. 결과는 `docs/eval/results.md`.
- 결정: `baidu/ernie-5.5-flash-preview:free` (15초, 원인 방향을 짚음). `inclusionai/ling-3.2-flash:free`가 원인을 가장 정확히 짚었지만 63초가 걸려 CI 대기 시간이 길다.
- 모델은 `analyzer/.env`의 `LLM_MODEL`로 바꾼다. 무료 모델 목록은 자주 바뀌므로 호출이 404면 이 비교를 다시 한다.
