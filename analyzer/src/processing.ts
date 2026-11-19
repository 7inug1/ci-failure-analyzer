import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

export interface FailedTest {
  name: string;
  message: string;
}

const PREFIX = /^[^\t\n]*\t[^\t\n]*\t\d{4}-\d{2}-\d{2}T[\d:.]+Z ?/;
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/** 줄 앞의 작업 이름, 단계 이름, 시각과 색상 코드, BOM을 지운다. */
export function cleanLog(raw: string): string {
  return raw
    .replace(/﻿/g, '')
    .split('\n')
    .map((line) => line.replace(PREFIX, '').replace(ANSI, ''))
    .join('\n');
}

const SECRET_PATTERNS: RegExp[] = [
  /ghp_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /\bgh[osu]_[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /sk-or-v1-[A-Za-z0-9]{20,}/g,
  /\bsk-[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
];
const KEY_VALUE =
  /\b(password|passwd|token|secret|api[_-]?key)(\s*[=:]\s*)(\S+)/gi;

/** 외부로 나가기 전 마지막 방어선: 비밀값처럼 보이는 것을 ***로 바꾸고 개수를 센다. */
export function maskSecrets(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, () => {
      count += 1;
      return '***';
    });
  }
  out = out.replace(KEY_VALUE, (m, key: string, sep: string, value: string) => {
    if (value === '***') return m; // 위 규칙에서 이미 가린 값은 다시 세지 않는다
    count += 1;
    return `${key}${sep}***`;
  });
  return { text: out, count };
}

const ERROR_WORDS = /error|failed|exception|✕|●/i;

/** 에러 줄의 앞뒤 15줄만 남기고, 12,000자를 넘으면 앞과 뒤를 절반씩 남긴다. */
export function extractErrorSection(
  text: string,
  context = 15,
  maxChars = 12000,
): string {
  const lines = text.split('\n');
  const keep = new Set<number>();
  lines.forEach((line, i) => {
    if (ERROR_WORDS.test(line)) {
      for (
        let j = Math.max(0, i - context);
        j <= Math.min(lines.length - 1, i + context);
        j++
      ) {
        keep.add(j);
      }
    }
  });
  const picked =
    keep.size === 0
      ? lines.slice(-context * 2)
      : [...keep].sort((a, b) => a - b).map((i) => lines[i]);
  const joined = picked.join('\n');
  if (joined.length <= maxChars) return joined;
  const half = Math.floor(maxChars / 2);
  return `${joined.slice(0, half)}\n...(중략)...\n${joined.slice(-half)}`;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** JUnit 리포트에서 실패한 테스트의 이름과 첫 줄 메시지를 최대 10개 뽑는다. */
export function parseFailedTests(
  reportXml: string | undefined,
  max = 10,
): FailedTest[] {
  if (!reportXml) return [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  let doc: any;
  try {
    doc = parser.parse(reportXml);
  } catch {
    return [];
  }
  const result: FailedTest[] = [];
  for (const suite of asArray<any>(doc?.testsuites?.testsuite)) {
    for (const tc of asArray<any>(suite?.testcase)) {
      const fail = tc?.failure ?? tc?.error;
      if (fail === undefined) continue;
      const body =
        typeof fail === 'string'
          ? fail
          : (fail['#text'] ?? fail['@_message'] ?? '');
      result.push({
        name: String(tc['@_name'] ?? ''),
        message: String(body).split('\n')[0].trim(),
      });
      if (result.length >= max) return result;
    }
  }
  return result;
}

/** 같은 원인의 실패는 같은 값을 갖는 12자리 지문. 리포트가 없으면 첫 에러 줄에서 숫자를 지우고 계산한다. */
export function fingerprint(input: {
  failedNames: string[];
  errorSection: string;
}): string {
  let basis: string;
  if (input.failedNames.length > 0) {
    basis = [...input.failedNames].sort().join('\n');
  } else {
    const first =
      input.errorSection.split('\n').find((l) => ERROR_WORDS.test(l)) ?? '';
    basis = first.replace(/\d+/g, '#');
  }
  return createHash('sha1').update(basis).digest('hex').slice(0, 12);
}

export interface PreparedInput {
  maskedCount: number;
  errorSection: string;
  failedTests: FailedTest[];
  fingerprint: string;
}

/** 로그와 리포트를 받아 서버가 쓰는 처리 결과를 한 번에 만든다. 외부로 나가는 내용은 비밀값이 가려진 것이다. */
export function prepareInput(
  rawLog: string,
  reportXml?: string,
): PreparedInput {
  const masked = maskSecrets(cleanLog(rawLog));
  const errorSection = extractErrorSection(masked.text);
  const failedTests = parseFailedTests(reportXml);
  return {
    maskedCount: masked.count,
    errorSection,
    failedTests,
    fingerprint: fingerprint({
      failedNames: failedTests.map((t) => t.name),
      errorSection,
    }),
  };
}

const DIFF_MAX_CHARS = 6000;

export interface PreparedDiff {
  text: string;
  maskedCount: number;
  truncated: boolean;
}

/** 이번 변경(diff)을 AI에게 보내기 전에 비밀값을 가리고 6,000자로 제한한다. */
export function prepareDiff(
  rawDiff: string | undefined,
  maxChars = DIFF_MAX_CHARS,
): PreparedDiff {
  if (!rawDiff || rawDiff.trim() === '')
    return { text: '', maskedCount: 0, truncated: false };
  const masked = maskSecrets(rawDiff);
  if (masked.text.length <= maxChars) {
    return { text: masked.text, maskedCount: masked.count, truncated: false };
  }
  return {
    text: `${masked.text.slice(0, maxChars)}\n...(이하 생략)...`,
    maskedCount: masked.count,
    truncated: true,
  };
}
