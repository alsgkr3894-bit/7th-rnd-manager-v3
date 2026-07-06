import { existsSync, readFileSync, rmSync, renameSync, readdirSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
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

function hasNextDevProcess() {
  if (process.platform === 'win32') return false;
  try {
    const out = execSync('ps -eo pid,command 2>/dev/null', { encoding: 'utf8' });
    return out.split('\n').some(line => {
      if (!line.includes('next dev') && !line.includes('next-server')) return false;
      // 이 프로세스 자체(clean-build.mjs)는 제외
      return !line.includes('clean-build');
    });
  } catch {
    return false;
  }
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function cleanupStaleDirs() {
  let cleaned = 0;
  try {
    readdirSync('.')
      .filter(f => f.startsWith('.next.stale-'))
      .forEach(f => {
        try {
          rmSync(f, { recursive: true, force: true });
          cleaned += 1;
        } catch {}
      });
  } catch {}
  return cleaned;
}

function verifyBuildOutput() {
  const requiredFiles = [
    '.next/BUILD_ID',
    '.next/prerender-manifest.json',
    '.next/server/app-paths-manifest.json',
    '.next/server/pages/_error.js',
  ];
  for (const file of requiredFiles) {
    if (!existsSync(file)) throw new Error(`missing build output: ${file}`);
  }

  const appPaths = JSON.parse(readFileSync('.next/server/app-paths-manifest.json', 'utf8'));
  for (const route of ['/page', '/report/page', '/settings/backup/page']) {
    if (!appPaths[route]) throw new Error(`missing app route in build manifest: ${route}`);
  }
}

// dev 서버 가동 중이면 중단 (포트 3000·3001, 프로세스 감지)
const [busy3000, busy3001] = await Promise.all([isPortBusy(3000), isPortBusy(3001)]);
if (busy3000 || busy3001 || hasNextDevProcess()) {
  const source = busy3000 ? '포트 3000' : busy3001 ? '포트 3001' : 'next dev 프로세스';
  console.error(`\n⚠  ${source}에 dev 서버가 실행 중입니다.`);
  console.error('   먼저 서버를 중지한 뒤 다시 실행하거나, npm run dev:clean 을 사용하세요.\n');
  process.exit(1);
}

// .next를 즉시 삭제하지 않고 rename → 빌드 완료 후 정리 (가동 중 파일 보호)
const staleDir = `.next.stale-${Date.now()}`;
try {
  renameSync('.next', staleDir);
} catch {
  // .next가 없으면 무시
}

let buildFailed = false;
try {
  await run(process.execPath, ['node_modules/next/dist/bin/next', 'build']);
  verifyBuildOutput();
} catch (error) {
  buildFailed = true;
  console.error(`\n✖ clean build failed: ${error.message}`);
} finally {
  const cleaned = cleanupStaleDirs();
  if (cleaned > 0) console.error(`clean-build: removed ${cleaned} stale .next directory(s).`);
}

if (buildFailed) process.exit(1);
