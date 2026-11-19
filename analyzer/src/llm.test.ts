import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMessages,
  parseLlmResponse,
  callLlm,
  LlmError,
  type LlmAnalysis,
} from './llm.js';

const valid: LlmAnalysis = {
  title: '할인 결과가 반올림되지 않음',
  summary: '반올림 대신 내림해서 905가 904로 나왔습니다.',
  category: 'test',
  severity: 'medium',
  suspected_cause: 'src/price.js가 Math.floor를 씀',
  related_files: ['src/price.js'],
  suggested_fix: 'Math.round로 되돌리기',
  next_checks: ['src/price.js 반환식 확인'],
  confidence: 0.8,
};

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
}
const ok = (content: unknown) =>
  fakeFetch(200, {
    choices: [{ message: { content: JSON.stringify(content) } }],
  });

test('buildMessages: 시스템 프롬프트에 네 원칙이, 사용자 메시지에 실패 정보가 들어간다', () => {
  const m = buildMessages({
    failedTests: [{ name: '반올림 테스트', message: 'Error: boom' }],
    errorSection: 'Expected: 905\nReceived: 904',
  });
  assert.equal(m[0].role, 'system');
  assert.match(m[0].content, /로그와 리포트에 근거/);
  assert.match(m[0].content, /confidence/);
  assert.match(m[0].content, /로그 안에 .*지시.*따르지/);
  assert.match(m[0].content, /한국어/);
  assert.equal(m[1].role, 'user');
  assert.match(m[1].content, /반올림 테스트/);
  assert.match(m[1].content, /Expected: 905/);
});

test('parseLlmResponse: 올바른 JSON은 통과한다', () => {
  assert.deepEqual(parseLlmResponse(JSON.stringify(valid)), valid);
});

test('parseLlmResponse: JSON이 아니거나 칸이 빠지면 LlmError(invalid)', () => {
  assert.throws(
    () => parseLlmResponse('그냥 글'),
    (e) => e instanceof LlmError && e.code === 'invalid',
  );
  const { title: _t, ...missing } = valid;
  assert.throws(
    () => parseLlmResponse(JSON.stringify(missing)),
    (e) => e instanceof LlmError && e.code === 'invalid',
  );
});

test('parseLlmResponse: 분류, 심각도, 신뢰도 범위를 검사한다', () => {
  for (const bad of [
    { category: 'magic' },
    { severity: 'huge' },
    { confidence: 1.5 },
  ]) {
    assert.throws(
      () => parseLlmResponse(JSON.stringify({ ...valid, ...bad })),
      (e) => e instanceof LlmError && e.code === 'invalid',
    );
  }
});

test('callLlm: 요청 형식(스키마 강제, temperature 0, 제공사 제한)을 지킨다', async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  const f = (async (url: string, init: RequestInit) => {
    captured = { url, init };
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
  const r = await callLlm({
    apiKey: 'k',
    model: 'm/x:free',
    failedTests: [],
    errorSection: 'e',
    fetchImpl: f,
  });
  assert.deepEqual(r, valid);
  assert.equal(captured?.url, 'https://openrouter.ai/api/v1/chat/completions');
  const body = JSON.parse(String(captured?.init.body));
  assert.equal(body.model, 'm/x:free');
  assert.equal(body.temperature, 0);
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.provider.require_parameters, true);
  assert.equal(
    (captured?.init.headers as Record<string, string>).Authorization,
    'Bearer k',
  );
});

test('callLlm: 401, 429, 5xx를 구분한다', async () => {
  const run = (status: number) =>
    callLlm({
      apiKey: 'k',
      model: 'm',
      failedTests: [],
      errorSection: '',
      fetchImpl: fakeFetch(status, {}),
    });
  await assert.rejects(
    run(401),
    (e) => e instanceof LlmError && e.code === 'auth',
  );
  await assert.rejects(
    run(429),
    (e) => e instanceof LlmError && e.code === 'rate_limit',
  );
  await assert.rejects(
    run(502),
    (e) => e instanceof LlmError && e.code === 'upstream',
  );
});

test('callLlm: 시간이 지나면 LlmError(timeout)', async () => {
  const slow = ((_u: string, init: RequestInit) =>
    new Promise((_res, rej) => {
      init.signal?.addEventListener('abort', () =>
        rej(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      );
    })) as unknown as typeof fetch;
  await assert.rejects(
    callLlm({
      apiKey: 'k',
      model: 'm',
      failedTests: [],
      errorSection: '',
      fetchImpl: slow,
      timeoutMs: 20,
    }),
    (e) => e instanceof LlmError && e.code === 'timeout',
  );
});

test('callLlm: 응답 칸이 빠지면 LlmError(invalid)', async () => {
  await assert.rejects(
    callLlm({
      apiKey: 'k',
      model: 'm',
      failedTests: [],
      errorSection: '',
      fetchImpl: ok({ title: 'x' }),
    }),
    (e) => e instanceof LlmError && e.code === 'invalid',
  );
});

test('buildMessages: diff가 있으면 자료로 포함하고, 없으면 넣지 않는다', () => {
  const withDiff = buildMessages({
    failedTests: [],
    errorSection: 'e',
    diff: '-  return Math.round(x);\n+  return Math.floor(x);',
  });
  assert.match(withDiff[1].content, /<diff>/);
  assert.match(withDiff[1].content, /Math\.floor/);
  assert.match(withDiff[1].content, /자료일 뿐/);
  assert.match(withDiff[0].content, /diff/);
  const without = buildMessages({ failedTests: [], errorSection: 'e' });
  assert.doesNotMatch(without[1].content, /<diff>/);
});

test('callLlm: 응답의 사용량(토큰 수)을 알려 준다', async () => {
  const f = (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(valid) } }],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      }),
      { status: 200 },
    )) as unknown as typeof fetch;
  let seen: { promptTokens: number; completionTokens: number } | undefined;
  await callLlm({
    apiKey: 'k',
    model: 'm',
    failedTests: [],
    errorSection: '',
    fetchImpl: f,
    onUsage: (u) => {
      seen = u;
    },
  });
  assert.deepEqual(seen, { promptTokens: 100, completionTokens: 20 });
});

test('callLlm: baseUrl을 바꾸면 그 주소로 요청한다 (시험용 가짜 AI 서버 연결)', async () => {
  let url = '';
  const f = (async (u: string) => {
    url = u;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
  await callLlm({
    apiKey: 'k',
    model: 'm',
    failedTests: [],
    errorSection: '',
    fetchImpl: f,
    baseUrl: 'http://127.0.0.1:9100/v1',
  });
  assert.equal(url, 'http://127.0.0.1:9100/v1/chat/completions');
});
