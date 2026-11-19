import type { LlmAnalysis } from './llm.js';
import type { FailedTest } from './processing.js';

/** JUnit 리포트(report.xml)에서 실패한 테스트 개수를 읽는다. 읽을 수 없으면 null. */
export function countFailures(reportXml: string | undefined): number | null {
  if (!reportXml) return null;
  const m = reportXml.match(/<testsuites[^>]*\sfailures="(\d+)"/);
  return m ? Number(m[1]) : null;
}

export interface CommentInput {
  llm: LlmAnalysis;
  model: string;
  sha: string;
  branch: string;
  event: string;
  runUrl: string;
  fingerprint: string;
  maskedCount: number;
  failedTests: FailedTest[];
  errorSection: string;
  diffChars?: number;
}

/** PR 댓글이나 이슈 본문으로 쓸 마크다운. 로그 발췌는 코드 블록 안에 넣는다. */
export function buildComment(i: CommentInput): string {
  const evidence = i.errorSection
    .split('\n')
    .slice(0, 10)
    .join('\n')
    .replace(/```/g, "'''");
  const tests =
    i.failedTests.length > 0
      ? i.failedTests.map((t) => `- ${t.name}: ${t.message}`)
      : ['- (리포트 없음)'];
  return [
    '### CI 실패 분석 (LLM 추정)',
    '',
    `**한 줄 요약** ${i.llm.summary}`,
    '',
    '| 분류 | 심각도 | 신뢰도 |',
    '|---|---|---|',
    `| ${i.llm.category} | ${i.llm.severity} | ${i.llm.confidence} |`,
    '',
    '**실패한 테스트**',
    ...tests,
    '',
    '**로그 근거**',
    '```',
    evidence,
    '```',
    '',
    `**추정 원인** ${i.llm.suspected_cause}`,
    '',
    '**다음에 확인할 곳**',
    ...i.llm.next_checks.map((c, n) => `${n + 1}. ${c}`),
    '',
    '<details><summary>실행 정보</summary>',
    '',
    `브랜치 \`${i.branch}\` (${i.event}), 커밋 \`${i.sha.slice(0, 7)}\`, [실행 기록](${i.runUrl})`,
    `지문 \`${i.fingerprint}\`, 가린 비밀값 ${i.maskedCount}개, 모델 \`${i.model}\`${i.diffChars ? `, 변경 내용(diff) ${i.diffChars}자 함께 분석` : ''}`,
    '',
    '</details>',
    '',
    '> 이 분석은 AI의 추정입니다. 코드는 수정하지 않았습니다.',
  ].join('\n');
}

/** 분석에 실패했을 때: AI가 한 말을 지어내지 않고 사유와 링크만 남긴다. */
export function buildFailureNotice(input: {
  reason: string;
  runUrl: string;
}): string {
  return [
    '### CI 실패 분석',
    '',
    `자동 분석을 하지 못했습니다 (사유: ${input.reason}).`,
    '',
    `[실행 기록](${input.runUrl})`,
  ].join('\n');
}
