import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = readFileSync(resolve('scripts/clean-build.mjs'), 'utf8');

describe('clean-build script safeguards', () => {
  test('dev 서버가 실행 중이면 build 전에 중단한다', () => {
    const guard = script.indexOf('if (busy3000 || busy3001 || hasNextDevProcess())');
    const runBuild = script.indexOf("await run(process.platform === 'win32' ? 'npx.cmd' : 'npx'");

    expect(guard).toBeGreaterThan(-1);
    expect(runBuild).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(runBuild);
  });

  test('build 실패 여부와 무관하게 stale .next 디렉터리를 정리한다', () => {
    const runBuild = script.indexOf("await run(process.platform === 'win32' ? 'npx.cmd' : 'npx'");
    const cleanup = script.indexOf('const cleaned = cleanupStaleDirs()');
    const exit = script.indexOf('if (buildFailed) process.exit(1)');

    expect(script).toContain('function cleanupStaleDirs()');
    expect(script).toContain('finally {');
    expect(runBuild).toBeGreaterThan(-1);
    expect(cleanup).toBeGreaterThan(runBuild);
    expect(exit).toBeGreaterThan(cleanup);
  });
});
