import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanLog,
  maskSecrets,
  extractErrorSection,
  parseFailedTests,
  fingerprint,
} from './processing.js';

test('cleanLog: 줄 앞의 작업 이름, 단계 이름, 시각을 지운다', () => {
  const raw =
    '린트와 테스트 (Node 20)\tRun npm test\t2026-11-19T03:27:33.1234567Z Expected: 905';
  assert.equal(cleanLog(raw), 'Expected: 905');
});

test('cleanLog: 색상 코드와 BOM을 지운다', () => {
  const raw = '﻿job\tstep\t2026-11-19T03:27:33.1Z \u001b[31mfailed\u001b[0m';
  assert.equal(cleanLog(raw), 'failed');
});

test('cleanLog: 접두사가 없는 줄은 그대로 둔다', () => {
  assert.equal(cleanLog('그냥 한 줄'), '그냥 한 줄');
});

test('maskSecrets: 토큰 모양의 값을 ***로 바꾸고 개수를 센다', () => {
  const text = [
    'a ghp_' + 'A'.repeat(36),
    'b github_pat_' + 'B'.repeat(30),
    'c AKIA' + 'C'.repeat(16),
    'd Authorization: Bearer abc.def-123',
    'e password=hunter2',
    'f TOKEN: xyz789',
    'g sk-or-v1-' + 'd'.repeat(40),
  ].join('\n');
  const { text: out, count } = maskSecrets(text);
  assert.equal(count, 7);
  assert.doesNotMatch(out, /ghp_A|github_pat_B|AKIAC|abc\.def|hunter2|xyz789|sk-or-v1-d/);
  assert.match(out, /password=\*\*\*/);
});

test('maskSecrets: 비밀값이 없으면 그대로이고 개수는 0', () => {
  const { text, count } = maskSecrets('Expected: 905\nReceived: 904');
  assert.equal(count, 0);
  assert.equal(text, 'Expected: 905\nReceived: 904');
});

test('extractErrorSection: 에러 줄의 앞뒤 15줄만 남긴다', () => {
  const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
  lines[50] = 'Error: boom';
  const out = extractErrorSection(lines.join('\n'));
  assert.match(out, /line 35/);
  assert.match(out, /Error: boom/);
  assert.match(out, /line 65/);
  assert.doesNotMatch(out, /line 34\b/);
  assert.doesNotMatch(out, /line 66\b/);
});

test('extractErrorSection: 12,000자를 넘으면 앞과 뒤를 절반씩 남긴다', () => {
  const big = Array.from({ length: 2000 }, (_, i) => `error line ${i}`).join('\n');
  const out = extractErrorSection(big);
  assert.ok(out.length <= 12100, `길이 ${out.length}`);
  assert.match(out, /error line 0\b/);
  assert.match(out, /error line 1999/);
  assert.match(out, /중략/);
});

test('extractErrorSection: 에러 키워드가 없으면 끝부분을 남긴다', () => {
  const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
  const out = extractErrorSection(lines);
  assert.match(out, /line 99/);
});

test('parseFailedTests: 실패한 테스트의 이름과 첫 줄 메시지를 뽑는다', () => {
  const xml = `<testsuites tests="3" failures="1"><testsuite name="s">
    <testcase classname="a b" name="a b"></testcase>
    <testcase classname="x" name="x 반올림"><failure>Error: expect(received).toBe(expected)
Expected: 905
Received: 904</failure></testcase></testsuite></testsuites>`;
  const r = parseFailedTests(xml);
  assert.equal(r.length, 1);
  assert.equal(r[0].name, 'x 반올림');
  assert.equal(r[0].message, 'Error: expect(received).toBe(expected)');
});

test('parseFailedTests: 최대 10개까지, 리포트가 없으면 빈 배열', () => {
  const cases = Array.from(
    { length: 15 },
    (_, i) => `<testcase name="t${i}"><failure>m${i}</failure></testcase>`,
  ).join('');
  assert.equal(parseFailedTests(`<testsuites><testsuite>${cases}</testsuite></testsuites>`).length, 10);
  assert.deepEqual(parseFailedTests(undefined), []);
});

test('fingerprint: 같은 실패는 같은 12자리, 다른 실패는 다른 값', () => {
  const a = fingerprint({ failedNames: ['b', 'a'], errorSection: '' });
  const b = fingerprint({ failedNames: ['a', 'b'], errorSection: '' });
  const c = fingerprint({ failedNames: ['c'], errorSection: '' });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{12}$/);
});

test('fingerprint: 리포트가 없으면 매번 바뀌는 숫자를 지우고 해시한다', () => {
  const a = fingerprint({ failedNames: [], errorSection: 'Error at 12:01:33 pid 4821' });
  const b = fingerprint({ failedNames: [], errorSection: 'Error at 09:55:10 pid 77' });
  assert.equal(a, b);
});
