import express from 'express';
import multer from 'multer';
import { buildComment, buildFailureNotice, countFailures } from './analysis.js';
import { callLlm, LlmError } from './llm.js';
import { prepareDiff, prepareInput } from './processing.js';

const REASONS: Record<string, string> = {
  auth: 'API 키 오류',
  rate_limit: '호출 한도 초과',
  upstream: 'AI 서비스 오류',
  timeout: '응답 시간 초과',
  invalid: 'AI 응답 형식 오류',
};

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// 지문만 계산하는 입구 (AI를 부르지 않음). 같은 실패의 이슈가 이미 있는지 먼저 확인할 때 쓴다.
app.post(
  '/fingerprint',
  upload.fields([
    { name: 'log', maxCount: 1 },
    { name: 'report', maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files as
      Record<string, Express.Multer.File[]> | undefined;
    const log = files?.log?.[0];
    if (!log) {
      res.status(400).type('text/plain').send('log 파일이 필요합니다');
      return;
    }
    const report = files?.report?.[0]?.buffer.toString('utf-8');
    res
      .type('text/plain')
      .send(prepareInput(log.buffer.toString('utf-8'), report).fingerprint);
  },
);

app.post(
  '/analyze',
  upload.fields([
    { name: 'log', maxCount: 1 },
    { name: 'report', maxCount: 1 },
    { name: 'diff', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as
      Record<string, Express.Multer.File[]> | undefined;
    const log = files?.log?.[0];
    if (!log) {
      res.status(400).type('text/plain').send('log 파일이 필요합니다');
      return;
    }
    const report = files?.report?.[0]?.buffer.toString('utf-8');
    const rawDiff = files?.diff?.[0]?.buffer.toString('utf-8');
    const body = req.body as Record<string, string | undefined>;
    const runUrl = body.run_url ?? '';
    const started = Date.now();

    // 외부로 나가기 전에 정리하고 비밀값을 가린다
    const prepared = prepareInput(log.buffer.toString('utf-8'), report);
    const { errorSection, failedTests } = prepared;
    const fp = prepared.fingerprint;
    const diff = prepareDiff(rawDiff);
    let usage = '';
    const tag = `[analyze] branch=${body.branch} sha=${(body.sha ?? '').slice(0, 7)} fp=${fp} masked=${prepared.maskedCount} section=${errorSection.length}자 failures=${countFailures(report)} diff=${diff.text.length}자${diff.truncated ? '(잘림)' : ''}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL;
    try {
      if (!apiKey || !model)
        throw new LlmError(
          'auth',
          'OPENROUTER_API_KEY 또는 LLM_MODEL이 없습니다',
        );
      const llm = await callLlm({
        apiKey,
        model,
        failedTests,
        errorSection,
        diff: diff.text || undefined,
        baseUrl: process.env.OPENROUTER_BASE_URL || undefined,
        onUsage: (u) => {
          usage = ` 토큰=${u.promptTokens}/${u.completionTokens}`;
        },
      });
      console.log(
        `${tag} model=${model} ${((Date.now() - started) / 1000).toFixed(1)}초${usage} OK`,
      );
      res.set(
        'X-Title-B64',
        Buffer.from(llm.title, 'utf-8').toString('base64'),
      );
      res.type('text/markdown').send(
        buildComment({
          llm,
          model,
          sha: body.sha ?? 'unknown',
          branch: body.branch ?? 'unknown',
          event: body.event ?? 'unknown',
          runUrl,
          fingerprint: fp,
          maskedCount: prepared.maskedCount,
          failedTests,
          errorSection,
          diffChars: diff.text.length || undefined,
        }),
      );
    } catch (e) {
      const code = e instanceof LlmError ? e.code : 'upstream';
      const why = e instanceof Error ? e.message : String(e);
      console.log(
        `${tag} 실패(${code}: ${why}) ${((Date.now() - started) / 1000).toFixed(1)}초`,
      );
      res.type('text/markdown').send(
        buildFailureNotice({
          reason: REASONS[code] ?? 'AI 서비스 오류',
          runUrl,
        }),
      );
    }
  },
);

const port = Number(process.env.PORT ?? 8000);
app.listen(port, '127.0.0.1', () => {
  console.log(
    `분석 서버가 http://127.0.0.1:${port} 에서 기다리는 중 (모델: ${process.env.LLM_MODEL ?? '미설정'})`,
  );
});
