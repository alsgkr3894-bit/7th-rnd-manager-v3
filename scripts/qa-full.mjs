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
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createQaDbSafetySnapshot, restoreQaDbSafetySnapshot } from './workflow/db-safety.mjs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function spawnCommand(command, args, options) {
  if (process.platform === 'win32' && /\.cmd$/i.test(command)) {
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command, ...args], {
      ...options,
      shell: false,
      windowsHide: true,
    });
  }

  return spawn(command, args, {
    ...options,
    shell: false,
    windowsHide: process.platform === 'win32',
  });
}

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(npm, ['run', script], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${script} 실패 (exit ${code})`));
    });
  });
}

const qaSafetyDir = mkdtempSync(join(tmpdir(), 'qa-full-db-'));
let qaSafetySnapshotPath = null;
let qaSafetyRestored = false;
let failure = null;

function restoreQaSafetySnapshotOnce() {
  if (!qaSafetySnapshotPath || qaSafetyRestored) return;
  restoreQaDbSafetySnapshot(qaSafetySnapshotPath);
  qaSafetyRestored = true;
}

process.once('exit', () => {
  try {
    restoreQaSafetySnapshotOnce();
  } catch (error) {
    process.stderr.write(`qa:full exit DB restore failed: ${error?.message || error}\n`);
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    try {
      restoreQaSafetySnapshotOnce();
    } catch (error) {
      process.stderr.write(`qa:full ${signal} DB restore failed: ${error?.message || error}\n`);
    } finally {
      process.exit(1);
    }
  });
}

try {
  qaSafetySnapshotPath = createQaDbSafetySnapshot(qaSafetyDir, `full-${Date.now()}`);
  await run('qa:smoke');
  await run('qa:mobile');
  await run('qa:runtime');
  await run('qa:workflow');
} catch (e) {
  failure = e;
  console.error('\n  qa:full 실패:', e.message, '\n');
} finally {
  const cleanupErrors = [];
  if (qaSafetySnapshotPath) {
    try {
      restoreQaSafetySnapshotOnce();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    rmSync(qaSafetyDir, { recursive: true, force: true });
  } catch {}
  if (cleanupErrors.length > 0) {
    throw new Error(
      `qa:full cleanup failed: ${cleanupErrors
        .map(error => error?.message || String(error))
        .join('; ')}`
    );
  }
}

if (failure) process.exit(1);
