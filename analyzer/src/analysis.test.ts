import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComment, buildFailureNotice, countFailures } from './analysis.js';
import type { LlmAnalysis } from './llm.js';

const llm: LlmAnalysis = {
  title: '할인 결과가 반올림되지 않음',
  summary: '반올림 대신 내림해서 905가 904로 나왔습니다.',
  category: 'test',
  severity: 'medium',
  suspected_cause: 'src/price.js가 Math.floor를 씀',
  related_files: ['src/price.js'],
  suggested_fix: 'Math.round로 되돌리기',
  next_checks: ['src/price.js 반환식 확인', '테스트 기대값 확인'],
  confidence: 0.8,
};

test('countFailures: 리포트에서 실패 개수를 읽는다', () => {
  assert.equal(
    countFailures('<testsuites name="j" tests="23" failures="1" errors="0">'),
    1,
  );
  assert.equal(countFailures(undefined), null);
  assert.equal(countFailures('<html></html>'), null);
});

test('buildComment: 템플릿 모양(요약, 표, 실패한 테스트, 근거, 원인, 확인할 곳, 안내)을 갖춘다', () => {
  const md = buildComment({
    llm,
    model: 'nvidia/x:free',
    sha: 'b190152aaaa',
    branch: 'bug/x',
    event: 'pull_request',
    runUrl: 'https://example.com/run/1',
    fingerprint: 'a1b2c3d4e5f6',
    maskedCount: 2,
    failedTests: [{ name: '반올림 테스트', message: 'Error: boom' }],
    errorSection: 'Expected: 905\nReceived: 904',
  });
  assert.match(md, /^### CI 실패 분석 \(LLM 추정\)/);
  assert.match(md, /\*\*한 줄 요약\*\* 반올림 대신/);
  assert.match(md, /\| test \| medium \| 0\.8 \|/);
  assert.match(md, /반올림 테스트: Error: boom/);
  assert.match(md, /Expected: 905/);
  assert.match(md, /\*\*추정 원인\*\* src\/price\.js가 Math\.floor를 씀/);
  assert.match(md, /1\. src\/price\.js 반환식 확인/);
  assert.match(md, /2\. 테스트 기대값 확인/);
  assert.match(md, /b190152/);
  assert.match(md, /a1b2c3d4e5f6/);
  assert.match(md, /가린 비밀값 2개/);
  assert.match(md, /nvidia\/x:free/);
  assert.match(md, /AI의 추정입니다/);
});

test('buildFailureNotice: 분석 실패 때는 지어내지 않고 사유와 링크만 보여 준다', () => {
  const md = buildFailureNotice({
    reason: '호출 한도 초과',
    runUrl: 'https://example.com/run/1',
  });
  assert.match(md, /자동 분석을 하지 못했습니다/);
  assert.match(md, /호출 한도 초과/);
  assert.match(md, /https:\/\/example\.com\/run\/1/);
  assert.doesNotMatch(md, /추정 원인/);
});

test('buildComment: 변경 내용(diff)을 함께 보낸 경우 실행 정보에 크기를 적는다', () => {
  const base = {
    llm,
    model: 'm',
    sha: 'abc1234',
    branch: 'b',
    event: 'pull_request',
    runUrl: 'u',
    fingerprint: 'f',
    maskedCount: 0,
    failedTests: [],
    errorSection: 'e',
  };
  assert.match(
    buildComment({ ...base, diffChars: 480 }),
    /변경 내용\(diff\) 480자/,
  );
  assert.doesNotMatch(buildComment(base), /변경 내용\(diff\)/);
});
