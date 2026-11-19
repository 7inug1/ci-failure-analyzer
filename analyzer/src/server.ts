import express from 'express';
import multer from 'multer';
import { buildFakeAnalysis, countFailures } from './analysis.js';
import {
  cleanLog,
  maskSecrets,
  extractErrorSection,
  parseFailedTests,
  fingerprint,
} from './processing.js';

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
  (req, res) => {
    const files = req.files as
      Record<string, Express.Multer.File[]> | undefined;
    const log = files?.log?.[0];
    if (!log) {
      res.status(400).type('text/plain').send('log 파일이 필요합니다');
      return;
    }
    const report = files?.report?.[0]?.buffer.toString('utf-8');
    const body = req.body as Record<string, string | undefined>;
    const rawLog = log.buffer.toString('utf-8');
    const masked = maskSecrets(cleanLog(rawLog));
    const errorSection = extractErrorSection(masked.text);
    const failedTests = parseFailedTests(report);
    const markdown = buildFakeAnalysis({
      sha: body.sha ?? 'unknown',
      branch: body.branch ?? 'unknown',
      event: body.event ?? 'unknown',
      runUrl: body.run_url ?? '',
      logChars: rawLog.length,
      failures: countFailures(report),
      maskedCount: masked.count,
      extractedChars: errorSection.length,
      fingerprint: fingerprint({
        failedNames: failedTests.map((t) => t.name),
        errorSection,
      }),
      failedTests,
    });
    console.log(
      `[analyze] branch=${body.branch} sha=${(body.sha ?? '').slice(0, 7)} log=${log.size}B report=${report ? 'O' : 'X'}`,
    );
    res.type('text/markdown').send(markdown);
  },
);

const port = Number(process.env.PORT ?? 8000);
app.listen(port, '127.0.0.1', () => {
  console.log(`분석 서버(가짜 답)가 http://127.0.0.1:${port} 에서 기다리는 중`);
});
