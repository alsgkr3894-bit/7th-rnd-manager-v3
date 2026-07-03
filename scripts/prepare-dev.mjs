import { execSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync, rmSync } from 'node:fs';
import net from 'node:net';

const killExisting = process.argv.includes('--kill');

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

function hasNextDevProcess() {
  if (process.platform === 'win32') return false;
  try {
    const out = execSync('ps -eo pid,command 2>/dev/null', { encoding: 'utf8' });
    return out.split('\n').some(line => {
      if (!line.includes('next dev') && !line.includes('next-server')) return false;
      return !line.includes('prepare-dev');
    });
  } catch {
    return false;
  }
}

function getWindowsPortPids(ports) {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const wanted = new Set(ports.map(String));
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5 || parts[0] !== 'TCP') continue;
      const localAddress = parts[1] || '';
      const state = parts[3] || '';
      const pid = parts[4] || '';
      const port = localAddress.slice(localAddress.lastIndexOf(':') + 1);
      if (state === 'LISTENING' && wanted.has(port) && /^\d+$/.test(pid) && pid !== '0') {
        pids.add(pid);
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killWindowsPortListeners(ports) {
  for (const pid of getWindowsPortPids(ports)) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } catch {}
  }
}

function killNextDev() {
  if (process.platform === 'win32') {
    killWindowsPortListeners([3000, 3001]);
    return;
  }
  try {
    execSync("pkill -f 'next dev' 2>/dev/null || true");
    execSync("pkill -f 'next-server' 2>/dev/null || true");
  } catch {
    // pkill returns non-zero when nothing matched.
  }
}

function cleanupOldStaleDirs() {
  try {
    for (const name of readdirSync('.')) {
      if (!name.startsWith('.next.dev-stale-')) continue;
      try {
        rmSync(name, { recursive: true, force: true });
      } catch {}
    }
  } catch {}
}

function resetNextDir() {
  if (!existsSync('.next')) {
    cleanupOldStaleDirs();
    return true;
  }
  const staleDir = `.next.dev-stale-${Date.now()}`;
  try {
    renameSync('.next', staleDir);
  } catch (err) {
    cleanupOldStaleDirs();
    process.stderr.write(`.next를 정리하지 못했습니다: ${err?.message || err}\n`);
    return false;
  }

  try {
    rmSync(staleDir, { recursive: true, force: true });
  } catch {}
  cleanupOldStaleDirs();
  return true;
}

if (killExisting) {
  killNextDev();
  await new Promise(resolve => setTimeout(resolve, 500));
}

const busy3000 = await isPortBusy(3000);
const busy3001 = await isPortBusy(3001);
const anotherDev = hasNextDevProcess();

if (busy3000 || busy3001 || anotherDev) {
  const source = busy3000 ? '포트 3000' : busy3001 ? '포트 3001' : 'next dev 프로세스';
  process.stderr.write(`${source}이 이미 실행 중이어서 .next를 정리하지 않았습니다.\n`);
  process.exit(1);
} else {
  if (!resetNextDir()) process.exit(1);
}
