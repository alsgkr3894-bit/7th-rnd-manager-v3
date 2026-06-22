import { rmSync, renameSync, readdirSync } from 'node:fs';
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn([command, ...args].join(' '), { stdio: 'inherit', shell: true })
        : spawn(command, args, { stdio: 'inherit', shell: false });
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
  await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build']);
} catch (error) {
  buildFailed = true;
  console.error(`\n✖ clean build failed: ${error.message}`);
} finally {
  const cleaned = cleanupStaleDirs();
  if (cleaned > 0) console.error(`clean-build: removed ${cleaned} stale .next directory(s).`);
}

if (buildFailed) process.exit(1);
