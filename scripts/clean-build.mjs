import { rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

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

rmSync('.next', { recursive: true, force: true });
await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build']);
