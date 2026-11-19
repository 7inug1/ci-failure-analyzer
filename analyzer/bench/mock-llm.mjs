// 시험용 가짜 AI 서버: 정해진 시간(DELAY_MS)만큼 기다렸다가 올바른 모양의 답을 돌려준다.
import http from 'node:http';

const delay = Number(process.env.DELAY_MS ?? 2000);
const port = Number(process.env.MOCK_PORT ?? 9100);
const analysis = {
  title: '시험용 가짜 답',
  summary: '시험용 가짜 AI의 답입니다.',
  category: 'test',
  severity: 'low',
  suspected_cause: '시험용',
  related_files: ['src/price.js'],
  suggested_fix: '시험용',
  next_checks: ['시험용'],
  confidence: 0.5,
};

http
  .createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      setTimeout(() => {
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(analysis) } }],
            usage: { prompt_tokens: 1000, completion_tokens: 200 },
          }),
        );
      }, delay);
    });
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`mock-llm ${port} delay=${delay}ms`),
  );
