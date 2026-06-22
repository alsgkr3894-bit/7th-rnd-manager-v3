import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BIN_DIR = join(ROOT, '.postgresql', 'pgsql', 'bin');
const DATA_DIR = join(ROOT, '.pgdata');

function exe(name) {
  return join(BIN_DIR, process.platform === 'win32' ? `${name}.exe` : name);
}

function usage() {
  return [
    'Usage:',
    '  npm run db:pg:serve',
    '  npm run db:pg:status',
    '  npm run db:pg:stop',
    '',
    'Notes:',
    '  db:pg:serve runs PostgreSQL in the foreground. Keep that terminal open.',
    '  Use another terminal for npm run db:bootstrap or npm run db:check.',
  ].join('\n');
}

function assertInstalled() {
  if (!existsSync(exe('postgres'))) {
    throw new Error('Portable PostgreSQL binary was not found under .postgresql/pgsql/bin.');
  }
  if (!existsSync(DATA_DIR)) {
    throw new Error('PostgreSQL data directory .pgdata was not found.');
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

function main() {
  const command = process.argv[2] || 'help';
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }

  assertInstalled();
  if (command === 'serve') {
    run(exe('postgres'), ['-D', DATA_DIR, '-h', '127.0.0.1', '-p', '5432']);
    return;
  }
  if (command === 'status') {
    run(exe('pg_ctl'), ['-D', DATA_DIR, 'status']);
    return;
  }
  if (command === 'stop') {
    run(exe('pg_ctl'), ['-D', DATA_DIR, 'stop', '-m', 'fast']);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main();
