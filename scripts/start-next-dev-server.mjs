import { spawn } from 'node:child_process';

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '3000'],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['pipe', 'inherit', 'inherit'],
    windowsHide: true,
  }
);

function stopChild() {
  if (!child.killed) child.kill();
}

process.on('SIGINT', stopChild);
process.on('SIGTERM', stopChild);
process.on('exit', stopChild);

child.on('exit', (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 0;
});
