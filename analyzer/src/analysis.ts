export interface AnalysisInput {
  sha: string;
  branch: string;
  event: string;
  runUrl: string;
  logChars: number;
  failures: number | null;
}

/** JUnit 리포트(report.xml)에서 실패한 테스트 개수를 읽는다. 읽을 수 없으면 null. */
export function countFailures(reportXml: string | undefined): number | null {
  if (!reportXml) return null;
  const m = reportXml.match(/<testsuites[^>]*\sfailures="(\d+)"/);
  return m ? Number(m[1]) : null;
}

/** 연결 확인용 가짜 분석. 진짜 AI 호출로 바꾸기 전까지 받은 정보를 그대로 보여 준다. */
export function buildFakeAnalysis(input: AnalysisInput): string {
  const failureLine =
    input.failures === null
      ? '리포트 없음 (로그만 받음)'
      : `실패한 테스트 ${input.failures}개`;
  return [
    '### CI 실패 분석 (연결 확인용 가짜 답)',
    '',
    '**한 줄 요약** 아직 AI를 부르지 않는 가짜 답입니다. 분석 서버까지 정보가 잘 전달됐습니다.',
    '',
    '**서버가 받은 정보**',
    `- 브랜치: \`${input.branch}\` (${input.event})`,
    `- 커밋: \`${input.sha.slice(0, 7)}\``,
    `- 로그: ${input.logChars.toLocaleString('en-US')}자`,
    `- 리포트: ${failureLine}`,
    '',
    `[실행 기록](${input.runUrl})`,
    '',
    '> 이 분석은 연결 확인용 가짜 답이며 AI의 추정이 아닙니다.',
  ].join('\n');
}
