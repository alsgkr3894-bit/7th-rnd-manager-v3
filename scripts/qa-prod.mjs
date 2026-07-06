import { existsSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';

function isPortBusy(port) {
  return new Promise(resolve => {
    const socket = net.createConnection(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || '3000';
const BASE = process.env.BASE || process.env.QA_BASE || `http://${HOST}:${PORT}`;
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

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      stdio: 'inherit',
      cwd: process.cwd(),
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
  const child = spawnCommand(process.execPath, [
    'node_modules/next/dist/bin/next',
    'start',
    '-H',
    HOST,
    '-p',
    PORT,
  ], {
    shell: false,
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));
  return child;
}

async function waitForBuildId(timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (existsSync('.next/BUILD_ID')) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('next build completed but .next/BUILD_ID was not created');
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
  child.kill(process.platform === 'win32' ? undefined : 'SIGINT');
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          });
        } else {
          child.kill('SIGTERM');
        }
      }
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
  if (await isPortBusy(Number(PORT))) {
    process.stderr.write(
      `포트 ${PORT}이 이미 사용 중입니다. 실행 중인 서버를 종료 후 다시 시도하세요.\n`
    );
    process.exit(1);
  }

  rmSync('.next', { recursive: true, force: true });
  await run(npm, ['run', 'build']);
  await waitForBuildId();

  server = spawnServer();
  server.on('exit', code => {
    if (code !== null && code !== 0) {
      process.stderr.write(`next start exited early with ${code}\n`);
    }
  });

  await waitForServer(BASE);
  await run(process.execPath, ['scripts/prod-static-chunk-audit.mjs'], { BASE, QA_BASE: BASE });
  await run(npm, ['run', 'qa:smoke'], { BASE, QA_BASE: BASE });
  await run(npm, ['run', 'qa:mobile'], { BASE, QA_BASE: BASE });
  await run(npm, ['run', 'qa:runtime'], { BASE, QA_BASE: BASE });
  await run(npm, ['run', 'qa:workflow'], { BASE, QA_BASE: BASE });
} finally {
  await stopServer(server);
}
