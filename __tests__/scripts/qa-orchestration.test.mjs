import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function src(path) {
  return readFileSync(resolve(path), 'utf8');
}

function expectInOrder(source, snippets) {
  let lastIndex = -1;

  for (const snippet of snippets) {
    const index = source.indexOf(snippet);
    expect(index).toBeGreaterThan(lastIndex);
    lastIndex = index;
  }
}

describe('QA orchestration scripts', () => {
  test('package.json에 dev/prod 전체 QA 스크립트가 등록되어 있다', () => {
    const scripts = JSON.parse(src('package.json')).scripts;

    expect(scripts['qa:full']).toBe('node scripts/qa-full.mjs');
    expect(scripts['qa:prod']).toBe('node scripts/qa-prod.mjs');
  });

  test('qa:full은 dev 서버 기준 전체 QA를 같은 순서로 실행한다', () => {
    const script = src('scripts/qa-full.mjs');

    expectInOrder(script, [
      "await run('qa:smoke')",
      "await run('qa:mobile')",
      "await run('qa:runtime')",
      "await run('qa:workflow')",
    ]);
    expect(script).toContain('process.exit(1)');
  });

  test('qa:prod는 clean build 후 prod 서버에서 전체 QA를 실행한다', () => {
    const script = src('scripts/qa-prod.mjs');

    expectInOrder(script, [
      "rmSync('.next', { recursive: true, force: true })",
      "await run(npm, ['run', 'build'])",
      'server = spawnServer()',
      'await waitForServer(BASE)',
      "await run(process.execPath, ['scripts/prod-static-chunk-audit.mjs'], { BASE, QA_BASE: BASE })",
      "await run(npm, ['run', 'qa:smoke'], { BASE, QA_BASE: BASE })",
      "await run(npm, ['run', 'qa:mobile'], { BASE, QA_BASE: BASE })",
      "await run(npm, ['run', 'qa:runtime'], { BASE, QA_BASE: BASE })",
      "await run(npm, ['run', 'qa:workflow'], { BASE, QA_BASE: BASE })",
    ]);
    expect(script).toContain('finally {');
    expect(script).toContain('await stopServer(server)');
  });

  test('production start 오류 fallback을 위한 pages/_error.js가 있다', () => {
    const errorPage = src('pages/_error.js');

    expect(errorPage).toContain('ErrorPage.getInitialProps');
    expect(errorPage).toContain('statusCode');
  });
});
