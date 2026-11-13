const fs = require('node:fs');
const path = require('node:path');

test('CI 로그에서 작업을 실행한 러너와 경로를 확인할 수 있다', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/ci.yml'), 'utf8');
  expect(workflow).toContain('name: 실행 위치 확인');
  expect(workflow).toContain('RUNNER_ENVIRONMENT');
  expect(workflow).toContain('RUNNER_NAME');
  expect(workflow).toContain('GITHUB_WORKSPACE');
  expect(workflow).toContain('pwd');
});
