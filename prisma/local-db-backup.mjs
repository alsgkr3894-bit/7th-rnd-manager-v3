import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BACKUP_DIR = resolve(ROOT, process.env.DB_BACKUP_DIR || '.db-backups');
const DEFAULT_KEEP = 14;
const DEFAULT_MAX_AGE_DAYS = 30;
const DEFAULT_AUTO_INTERVAL_HOURS = 20;
// 로그인 직후 자동 시작(register-db-backup-autostart.ps1)으로 실행되면 로컬 Postgres가
// 아직 안 떠 있어 pg_dump가 곧바로 실패하는 경우가 실제로 여러 번 있었다(2026-09-14~18에
// 0바이트 백업 4개 발생) — 곧장 포기하지 않고 잠깐씩 기다렸다 재시도한다.
export const DEFAULT_AUTO_RETRY_ATTEMPTS = 20;
export const DEFAULT_AUTO_RETRY_DELAY_MS = 30_000;

function usage() {
  return [
    'Usage:',
    '  npm run db:backup',
    '  npm run db:backup:auto',
    '  npm run db:backup:list',
    '  npm run db:backup:prune',
    '',
    'Options:',
    '  --dir <path>       Backup directory. Default: .db-backups',
    '  --keep <number>    Number of latest backups to keep during prune. Default: 14',
    '  --days <number>    Delete backups older than this during prune. Default: 30',
    '  --hours <number>   Auto backup interval. Default: 20',
  ].join('\n');
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function numberArg(name, fallback) {
  const value = Number(argValue(name, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getBackupDir(overrideDir) {
  return resolve(ROOT, overrideDir || argValue('--dir', BACKUP_DIR));
}

function parseDatabaseUrl() {
  const raw = String(process.env.DATABASE_URL || '').trim();
  if (!raw) throw new Error('DATABASE_URL is required.');

  const url = new URL(raw);
  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    host: url.hostname || '127.0.0.1',
    password: decodeURIComponent(url.password || ''),
    port: url.port || '5432',
    user: decodeURIComponent(url.username || ''),
  };
}

function postgresBin(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const portable = join(ROOT, '.postgresql', 'pgsql', 'bin', executable);
  return existsSync(portable) ? portable : executable;
}

function timestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

/**
 * .dump 파일 중 "쓸 수 있는" 백업만 돌려준다 — 0바이트이거나 .json 사이드카가 없는 파일은
 * 실패한 pg_dump가 남긴 잔해로 보고 list/auto/prune 어디서도 정상 백업으로 세지 않는다.
 * (실패 원인: 사이드카는 pg_dump 성공 *이후*에만 쓰인다 — createBackup 참고.)
 */
export function backupFiles(dir = getBackupDir()) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(name => name.endsWith('.dump'))
    .map(name => {
      const path = join(dir, name);
      const stat = statSync(path);
      return {
        name,
        path,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        mtime: stat.mtime.toISOString(),
        hasMeta: existsSync(`${path}.json`),
      };
    })
    .filter(file => file.size > 0 && file.hasMeta)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export function createBackup(overrideDir) {
  const dir = getBackupDir(overrideDir);
  const db = parseDatabaseUrl();
  mkdirSync(dir, { recursive: true });

  const safeDatabase = db.database.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'database';
  const file = join(dir, `${safeDatabase}-${timestamp()}.dump`);
  const pgDump = postgresBin('pg_dump');
  const args = [
    '-h',
    db.host,
    '-p',
    db.port,
    '-U',
    db.user,
    '-d',
    db.database,
    '-Fc',
    '--no-owner',
    '--no-privileges',
    '-f',
    file,
  ];

  const result = spawnSync(pgDump, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      PGPASSWORD: db.password,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) {
    // pg_dump가 실패해도 -f로 지정한 파일이 만들어졌을 수 있다(보통 0바이트) — 다음
    // backupFiles() 스캔이 이를 최신 백업으로 오인하지 않도록 즉시 지운다.
    try {
      rmSync(file, { force: true });
    } catch {
      // 애초에 안 만들어졌으면 무시.
    }
    if (result.error) throw result.error;
    throw new Error(
      result.stderr || result.stdout || `pg_dump failed with status ${result.status}`
    );
  }

  const stat = statSync(file);
  const meta = {
    createdAt: new Date().toISOString(),
    database: db.database,
    file: basename(file),
    host: db.host,
    port: db.port,
    size: stat.size,
  };
  writeFileSync(`${file}.json`, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  return { ok: true, backup: meta, path: file };
}

export function listBackups(overrideDir) {
  const dir = getBackupDir(overrideDir);
  const files = backupFiles(dir);
  return {
    ok: true,
    backupDir: dir,
    backups: files.map(file => ({
      name: file.name,
      size: file.size,
      modifiedAt: file.mtime,
    })),
  };
}

export function pruneBackups(overrideDir) {
  const dir = getBackupDir(overrideDir);
  const keep = numberArg('--keep', DEFAULT_KEEP);
  const days = numberArg('--days', DEFAULT_MAX_AGE_DAYS);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const files = backupFiles(dir);
  const removed = [];

  files.forEach((file, index) => {
    if (index < keep || file.mtimeMs >= cutoff) return;
    rmSync(file.path, { force: true });
    rmSync(`${file.path}.json`, { force: true });
    removed.push(file.name);
  });

  return {
    ok: true,
    backupDir: dir,
    keep,
    days,
    removed,
    remaining: backupFiles(dir).length,
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// DATABASE_URL 미설정 같은 구성 오류는 시간이 지난다고 나아지지 않는다 — 재시도 대상은
// "로컬 Postgres가 아직 안 뜬" 것 같은 일시적 연결 실패뿐이다.
function isTransientBackupError(err) {
  return !/DATABASE_URL is required/.test(err?.message || '');
}

export async function autoBackup(options = {}) {
  const {
    dir,
    retryAttempts = DEFAULT_AUTO_RETRY_ATTEMPTS,
    retryDelayMs = DEFAULT_AUTO_RETRY_DELAY_MS,
  } = options;
  const hours = numberArg('--hours', DEFAULT_AUTO_INTERVAL_HOURS);
  const newest = backupFiles(getBackupDir(dir))[0];
  if (newest && Date.now() - newest.mtimeMs < hours * 60 * 60 * 1000) {
    return {
      ok: true,
      skipped: true,
      reason: `Latest backup is newer than ${hours} hours.`,
      latest: {
        name: newest.name,
        modifiedAt: newest.mtime,
        size: newest.size,
      },
    };
  }

  let lastError = null;
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const created = createBackup(dir);
      const pruned = pruneBackups(dir);
      return { ...created, pruned, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (!isTransientBackupError(err)) break;
      if (attempt < retryAttempts) await delay(retryDelayMs);
    }
  }
  throw lastError;
}

function print(result) {
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const command = process.argv[2] || 'help';
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }
  if (command === 'create') return print(createBackup());
  if (command === 'list') return print(listBackups());
  if (command === 'prune') return print(pruneBackups());
  if (command === 'auto') return print(await autoBackup());

  throw new Error(`Unknown command: ${command}`);
}

// 이 파일을 테스트에서 import해도 CLI가 실행되지 않도록, 직접 실행됐을 때만 main()을 돈다.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch(err => {
    console.error(err?.message || err);
    process.exitCode = 1;
  });
}
