import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFakeAnalysis, countFailures } from './analysis.js';

test('countFailures: 리포트에서 실패 개수를 읽는다', () => {
  const xml =
    '<testsuites name="jest tests" tests="23" failures="1" errors="0">';
  assert.equal(countFailures(xml), 1);
});

test('countFailures: 리포트가 없거나 모양이 다르면 null', () => {
  assert.equal(countFailures(undefined), null);
  assert.equal(countFailures('<html></html>'), null);
});

test('buildFakeAnalysis: 받은 정보를 댓글 마크다운에 담는다', () => {
  const md = buildFakeAnalysis({
    sha: 'b190152',
    branch: 'bug/x',
    event: 'pull_request',
    runUrl: 'https://example.com/run/1',
    logChars: 1234,
    failures: 1,
  });
  assert.match(md, /CI 실패 분석/);
  assert.match(md, /연결 확인용 가짜 답/);
  assert.match(md, /bug\/x/);
  assert.match(md, /1,234자/);
  assert.match(md, /실패한 테스트 1개/);
  assert.match(md, /https:\/\/example\.com\/run\/1/);
});

test('buildFakeAnalysis: 리포트가 없으면 그 사실을 적는다', () => {
  const md = buildFakeAnalysis({
    sha: 'abc',
    branch: 'b',
    event: 'push',
    runUrl: 'u',
    logChars: 10,
    failures: null,
  });
  assert.match(md, /리포트 없음/);
});

test('buildFakeAnalysis: 처리 결과(가린 개수, 지문, 실패한 테스트)를 보여 준다', () => {
  const md = buildFakeAnalysis({
    sha: 'abc1234',
    branch: 'b',
    event: 'pull_request',
    runUrl: 'u',
    logChars: 3000,
    failures: 1,
    maskedCount: 2,
    extractedChars: 800,
    fingerprint: 'a1b2c3d4e5f6',
    failedTests: [{ name: '반올림 테스트', message: 'Error: boom' }],
  });
  assert.match(md, /가린 비밀값 2개/);
  assert.match(md, /줄인 로그 800자/);
  assert.match(md, /a1b2c3d4e5f6/);
  assert.match(md, /반올림 테스트/);
  assert.match(md, /Error: boom/);
});
