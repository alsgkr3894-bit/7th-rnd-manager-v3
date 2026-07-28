import { spawn } from 'node:child_process';

// 기본은 루프백. 사내 LAN 공개가 필요하면 RND_SITE_HOST=0.0.0.0 으로 띄운다
// (API 쪽은 RND_ALLOW_LAN=1 도 함께 켜야 lib/server/request-guard.js 를 통과한다).
const host = process.env.RND_SITE_HOST || '127.0.0.1';

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '-H', host, '-p', '3000'],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['pipe', 'inherit', 'inherit'],
    windowsHide: true,
  }
);
const keepAlive = setInterval(() => {}, 1_000_000_000);

function stopChild() {
  if (!child.killed) child.kill();
}

process.on('SIGINT', stopChild);
process.on('SIGTERM', stopChild);
process.on('exit', stopChild);

child.on('exit', (code, signal) => {
  clearInterval(keepAlive);
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 0;
});
