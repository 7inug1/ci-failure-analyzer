import express from 'express';
import multer from 'multer';
import { buildComment, buildFailureNotice, countFailures } from './analysis.js';
import { callLlm, LlmError } from './llm.js';
import {
  cleanLog,
  maskSecrets,
  extractErrorSection,
  parseFailedTests,
  fingerprint,
} from './processing.js';

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

app.post(
  '/analyze',
  upload.fields([
    { name: 'log', maxCount: 1 },
    { name: 'report', maxCount: 1 },
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
    const body = req.body as Record<string, string | undefined>;
    const runUrl = body.run_url ?? '';
    const started = Date.now();

    // 외부로 나가기 전에 정리하고 비밀값을 가린다
    const masked = maskSecrets(cleanLog(log.buffer.toString('utf-8')));
    const errorSection = extractErrorSection(masked.text);
    const failedTests = parseFailedTests(report);
    const fp = fingerprint({
      failedNames: failedTests.map((t) => t.name),
      errorSection,
    });
    const tag = `[analyze] branch=${body.branch} sha=${(body.sha ?? '').slice(0, 7)} fp=${fp} masked=${masked.count} section=${errorSection.length}자 failures=${countFailures(report)}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL;
    try {
      if (!apiKey || !model)
        throw new LlmError(
          'auth',
          'OPENROUTER_API_KEY 또는 LLM_MODEL이 없습니다',
        );
      const llm = await callLlm({ apiKey, model, failedTests, errorSection });
      console.log(
        `${tag} model=${model} ${((Date.now() - started) / 1000).toFixed(1)}초 OK`,
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
          maskedCount: masked.count,
          failedTests,
          errorSection,
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
