import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import net from 'node:net';
import { createQaDbSafetySnapshot, restoreQaDbSafetySnapshot } from './workflow/db-safety.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || '3200';
const BASE = process.env.BASE || process.env.QA_BASE || `http://${HOST}:${PORT}`;

function usage() {
  return [
    'Usage:',
    '  node scripts/run-audit-with-server.mjs <script.mjs>',
    '',
    'Environment:',
    '  PORT=3200 BASE=http://127.0.0.1:3200 QA_BASE=http://127.0.0.1:3200',
  ].join('\n');
}

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

function isPortBusy(port) {
  return new Promise(resolve => {
    const socket = net.createConnection(port, HOST);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

function spawnServer() {
  const child = spawnCommand(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', HOST, '-p', PORT],
    {
      cwd: process.cwd(),
      env: { ...process.env, HOST, PORT, BASE, QA_BASE: BASE },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
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
    } catch {}
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
          const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          });
          killer.once('exit', resolve);
          killer.once('error', resolve);
          return;
        }
        child.kill('SIGTERM');
      }
      resolve();
    }, 3_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

const target = process.argv[2];
if (!target) {
  console.error(usage());
  process.exit(2);
}

const scriptPath = isAbsolute(target) ? target : resolve(process.cwd(), target);
if (!existsSync(scriptPath)) throw new Error(`Audit script not found: ${scriptPath}`);

if (await isPortBusy(Number(PORT))) {
  throw new Error(`Port ${PORT} is already in use.`);
}

const safetyDir = mkdtempSync(join(tmpdir(), 'audit-server-db-'));
const snapshotPath = createQaDbSafetySnapshot(safetyDir, `audit-${Date.now()}`);
let server = null;

try {
  process.env.BASE = BASE;
  process.env.QA_BASE = BASE;
  process.env.PORT = PORT;

  server = spawnServer();
  server.on('exit', code => {
    if (code !== null && code !== 0) {
      process.stderr.write(`next start exited early with ${code}\n`);
    }
  });
  await waitForServer(BASE);
  await import(pathToFileURL(scriptPath).href);
} finally {
  await stopServer(server);
  restoreQaDbSafetySnapshot(snapshotPath);
  rmSync(safetyDir, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
