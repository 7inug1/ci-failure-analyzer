---
name: scenario-patch
description: 실패 시나리오를 patches/ 아래 패치 파일 하나와 docs/answers.md 정답표 한 줄로 만든다
---

# 실패 시나리오 패치 만들기

1. 원인이 한 가지인 버그를 `src/`의 코드에 직접 넣는다. 어떤 테스트가 몇 개 실패할지 먼저 예상한다.
2. `git diff -- src > patches/<s번호>-<무엇이-어떻게-깨지는지>.patch`로 저장하고 `git restore src`로 되돌린다. 파일 이름은 영어 소문자와 하이픈으로, 원인이 드러나게 적는다.
3. 패치를 적용해 `npm test`를 돌리고 실제 실패 개수와 메시지를 확인한다. 예상과 다르면 패치를 고친다.
4. `git restore src`로 되돌리고 `npm test`가 전부 통과하는지 확인한다.
5. `docs/answers.md` 표에 원인, 고칠 파일, 실제 실패 문구를 한 줄 추가한다. AI 분석 결과를 보기 전에 적는다.
6. `git apply --check`를 쓰지 말고 3번의 실제 적용으로 확인한다.
