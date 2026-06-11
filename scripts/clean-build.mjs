import { rmSync, renameSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';

function isPortBusy(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

// dev 서버 가동 중이면 중단
if (await isPortBusy(3000)) {
  console.error('\n⚠  포트 3000에 dev 서버가 실행 중입니다.');
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

await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build']);

// 오래된 .next.stale-* 정리
try {
  readdirSync('.')
    .filter(f => f.startsWith('.next.stale-'))
    .forEach(f => {
      try {
        rmSync(f, { recursive: true, force: true });
      } catch {}
    });
} catch {}
