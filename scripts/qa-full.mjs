/**
 * scripts/qa-full.mjs — dev 서버 전체 QA (smoke → mobile → runtime → workflow)
 *
 * dev 서버(localhost:3000)가 떠 있는 상태에서 실행:
 *   npm run qa:full
 *
 * smoke/mobile: 페이지 렌더링·가로스크롤 검사 (702px / 390px)
 * runtime: 전 라우트 JS 에러·하이드레이션 회귀 (main + china4 멀티브랜드)
 * workflow: 핵심 업무 흐름 E2E 시나리오
 *
 * 하나라도 실패하면 즉시 종료 (exit 1).
 */
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', script], { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${script} 실패 (exit ${code})`));
    });
  });
}

try {
  await run('qa:smoke');
  await run('qa:mobile');
  await run('qa:runtime');
  await run('qa:workflow');
} catch (e) {
  console.error('\n  qa:full 실패:', e.message, '\n');
  process.exit(1);
}
