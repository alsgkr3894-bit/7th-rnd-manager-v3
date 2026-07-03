import { spawn } from 'node:child_process';

const port = process.env.NEXT_AUDIT_PORT || '3001';
const host = process.env.NEXT_AUDIT_HOST || '127.0.0.1';
const base = `http://${host}:${port}`;
const auditArgs = process.argv.slice(2);

if (auditArgs.length === 0) {
  console.error('Usage: node scripts/run-next-start-audit.mjs <audit-script> [args...]');
  process.exit(2);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(child) {
  let lastError = null;
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited before readiness with code ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${base}/api/db/backups`, { redirect: 'manual' });
      if (res.status < 500) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(1000);
  }
  throw new Error(`Timed out waiting for ${base}: ${lastError?.message || 'unknown error'}`);
}

function runNode(args, options = {}) {
  return spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    windowsHide: true,
    ...options,
  });
}

const server = runNode(['node_modules/next/dist/bin/next', 'start', '-H', host, '-p', port], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', chunk => process.stdout.write(`[next] ${chunk}`));
server.stderr.on('data', chunk => process.stderr.write(`[next:err] ${chunk}`));

let serverExited = false;
server.on('exit', (code, signal) => {
  serverExited = true;
  process.stderr.write(`[next] exited code=${code} signal=${signal}\n`);
});

let auditCode = 1;

try {
  await waitForServer(server);
  console.log(`[runner] ready ${base}`);

  const audit = runNode(auditArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      BASE: base,
    },
  });

  auditCode = await new Promise(resolve => {
    audit.on('exit', code => resolve(code ?? 1));
  });
} catch (error) {
  console.error(`[runner] ${error?.message || error}`);
  auditCode = 2;
} finally {
  if (!serverExited) {
    server.kill();
    await wait(1000);
    if (!serverExited && process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    }
  }
}

process.exit(auditCode);
