import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = process.cwd();
const BACKUP_DIR = resolve(ROOT, process.env.DB_BACKUP_DIR || '.db-backups');
const DEFAULT_KEEP = 14;
const DEFAULT_MAX_AGE_DAYS = 30;
const DEFAULT_AUTO_INTERVAL_HOURS = 20;

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

function getBackupDir() {
  return resolve(ROOT, argValue('--dir', BACKUP_DIR));
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

function backupFiles(dir = getBackupDir()) {
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
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function createBackup() {
  const dir = getBackupDir();
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

  if (result.error) throw result.error;
  if (result.status !== 0) {
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

function listBackups() {
  const files = backupFiles();
  return {
    ok: true,
    backupDir: getBackupDir(),
    backups: files.map(file => ({
      name: file.name,
      size: file.size,
      modifiedAt: file.mtime,
    })),
  };
}

function pruneBackups() {
  const dir = getBackupDir();
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

function autoBackup() {
  const hours = numberArg('--hours', DEFAULT_AUTO_INTERVAL_HOURS);
  const newest = backupFiles()[0];
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

  const created = createBackup();
  const pruned = pruneBackups();
  return { ...created, pruned };
}

function print(result) {
  console.log(JSON.stringify(result, null, 2));
}

function main() {
  const command = process.argv[2] || 'help';
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }
  if (command === 'create') return print(createBackup());
  if (command === 'list') return print(listBackups());
  if (command === 'prune') return print(pruneBackups());
  if (command === 'auto') return print(autoBackup());

  throw new Error(`Unknown command: ${command}`);
}

main();
