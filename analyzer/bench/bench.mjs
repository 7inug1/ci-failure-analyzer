// 런타임 비교 측정: 같은 서버 코드를 Node.js 또는 Bun으로 실행해 시작 시간, 메모리, 처리 속도, 동시 사용을 잰다.
// 사용법: node bench/bench.mjs <node|bun> [trials=3]
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const runtime = process.argv[2];
const trials = Number(process.argv[3] ?? 3);
if (!['node', 'bun'].includes(runtime)) {
  console.error('사용법: node bench/bench.mjs <node|bun> [trials]');
  process.exit(1);
}
const FP_TOTAL = Number(process.env.FP_TOTAL ?? 600);
const FP_CONC = Number(process.env.FP_CONC ?? 20);
const DELAY_MS = Number(process.env.DELAY_MS ?? 2000);
const SERVER_PORT = 8100;
const MOCK_PORT = 9100;

const log = readFileSync(path.join(here, 'fixtures/log.txt'));
const report = readFileSync(path.join(here, 'fixtures/report.xml'));
const base = `http://127.0.0.1:${SERVER_PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (a, p) =>
  [...a].sort((x, y) => x - y)[
    Math.min(a.length - 1, Math.floor((a.length * p) / 100))
  ];

async function post(route) {
  const fd = new FormData();
  fd.append('log', new Blob([log]), 'log.txt');
  fd.append('report', new Blob([report]), 'report.xml');
  fd.append('sha', 'abc1234');
  fd.append('branch', 'bench');
  fd.append('event', 'pull_request');
  fd.append('run_url', 'u');
  const t = performance.now();
  const r = await fetch(base + route, { method: 'POST', body: fd });
  await r.text();
  return { ms: performance.now() - t, ok: r.ok };
}

async function pool(total, conc, fn) {
  const out = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (next < total) {
        next += 1;
        out.push(await fn());
      }
    }),
  );
  return out;
}

const rssMb = (pid) =>
  Number(
    execFileSync('ps', ['-o', 'rss=', '-p', String(pid)])
      .toString()
      .trim(),
  ) / 1024;

async function trial() {
  const mock = spawn('node', [path.join(here, 'mock-llm.mjs')], {
    env: {
      ...process.env,
      DELAY_MS: String(DELAY_MS),
      MOCK_PORT: String(MOCK_PORT),
    },
    stdio: 'ignore',
  });
  await sleep(300);
  const cmd =
    runtime === 'bun'
      ? ['bun', ['src/server.ts']]
      : ['node', ['--import', 'tsx', 'src/server.ts']];
  const env = {
    ...process.env,
    PORT: String(SERVER_PORT),
    OPENROUTER_API_KEY: 'dummy',
    LLM_MODEL: 'mock/model',
    OPENROUTER_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
  };
  const t0 = performance.now();
  const server = spawn(cmd[0], cmd[1], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const startupMs = await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => {
      if (String(d).includes('기다리는 중')) resolve(performance.now() - t0);
    });
    setTimeout(() => reject(new Error('서버 시작 시간 초과')), 30000);
  });
  const idleMb = rssMb(server.pid);

  await pool(30, 5, () => post('/fingerprint')); // 예열
  const t1 = performance.now();
  const fp = await pool(FP_TOTAL, FP_CONC, () => post('/fingerprint'));
  const fpSec = (performance.now() - t1) / 1000;
  const loadMb = rssMb(server.pid);

  // 5명 동시 사용: 가짜 AI가 DELAY_MS 걸리는 요청을 5개 동시에, 5번 반복
  const rounds = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    const r = await Promise.all(
      Array.from({ length: 5 }, () => post('/analyze')),
    );
    rounds.push({ wall: performance.now() - s, ok: r.every((x) => x.ok) });
  }
  // 20명 동시 사용
  const s20 = performance.now();
  const r20 = await Promise.all(
    Array.from({ length: 20 }, () => post('/analyze')),
  );
  const wall20 = performance.now() - s20;

  server.kill();
  mock.kill();
  await sleep(500);
  return {
    startupMs,
    idleMb,
    loadMb,
    fpReqPerSec: FP_TOTAL / fpSec,
    fpP50: median(fp.map((x) => x.ms)),
    fpP95: pct(
      fp.map((x) => x.ms),
      95,
    ),
    fpErrors: fp.filter((x) => !x.ok).length,
    wall5: median(rounds.map((x) => x.wall)),
    wall5ok: rounds.every((x) => x.ok),
    wall20,
    wall20ok: r20.every((x) => x.ok),
  };
}

const version =
  runtime === 'bun'
    ? execFileSync('bun', ['--version']).toString().trim()
    : process.version;
const results = [];
for (let i = 0; i < trials; i++) results.push(await trial());
const m = (k) => median(results.map((r) => r[k]));
const out = {
  runtime,
  version,
  trials,
  startup_ms: Math.round(m('startupMs')),
  idle_mb: Number(m('idleMb').toFixed(1)),
  load_mb: Number(m('loadMb').toFixed(1)),
  fingerprint_req_per_sec: Math.round(m('fpReqPerSec')),
  fingerprint_p50_ms: Number(m('fpP50').toFixed(1)),
  fingerprint_p95_ms: Number(m('fpP95').toFixed(1)),
  fingerprint_errors: results.reduce((a, r) => a + r.fpErrors, 0),
  analyze_5_concurrent_wall_ms: Math.round(m('wall5')),
  analyze_20_concurrent_wall_ms: Math.round(m('wall20')),
  mock_llm_delay_ms: DELAY_MS,
  all_ok: results.every((r) => r.wall5ok && r.wall20ok),
};
console.log(JSON.stringify(out, null, 2));
