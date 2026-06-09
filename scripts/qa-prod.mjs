import { rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || '3000';
const BASE = process.env.BASE || process.env.QA_BASE || `http://${HOST}:${PORT}`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function spawnServer() {
  const child = spawn(npx, ['next', 'start', '-H', HOST, '-p', PORT], {
    shell: false,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));
  return child;
}

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      // Retry until the server accepts connections.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  child.kill('SIGINT');
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGTERM');
      resolve();
    }, 3_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

let server = null;

try {
  rmSync('.next', { recursive: true, force: true });
  await run(npm, ['run', 'build']);

  server = spawnServer();
  server.on('exit', code => {
    if (code !== null && code !== 0) {
      process.stderr.write(`next start exited early with ${code}\n`);
    }
  });

  await waitForServer(BASE);
  await run(npm, ['run', 'qa:smoke'], { BASE, QA_BASE: BASE });
  await run(npm, ['run', 'qa:runtime'], { BASE, QA_BASE: BASE });
} finally {
  await stopServer(server);
}
