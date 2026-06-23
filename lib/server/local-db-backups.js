import { execFile } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_BACKUP_DIR = '.db-backups';
const STALE_AFTER_HOURS = 26;

function rootOf(options = {}) {
  return options.cwd || process.cwd();
}

function backupDirOf(options = {}) {
  return resolve(rootOf(options), options.backupDir || process.env.DB_BACKUP_DIR || DEFAULT_BACKUP_DIR);
}

function readJsonSidecar(path) {
  try {
    const raw = readFileSync(`${path}.json`, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function backupAgeHoursOf(modifiedAt) {
  const time = new Date(modifiedAt).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / 3_600_000);
}

export function listLocalDbBackups(options = {}) {
  const backupDir = backupDirOf(options);
  if (!existsSync(backupDir)) {
    return {
      ok: true,
      backupDir,
      backups: [],
      count: 0,
      totalSize: 0,
      latest: null,
      stale: true,
      checkedAt: new Date().toISOString(),
    };
  }

  const backups = readdirSync(backupDir)
    .filter(name => name.endsWith('.dump'))
    .map(name => {
      const path = join(backupDir, name);
      const stat = statSync(path);
      const meta = readJsonSidecar(path);
      const modifiedAt = stat.mtime.toISOString();
      return {
        name,
        path,
        size: stat.size,
        modifiedAt,
        createdAt: meta?.createdAt || modifiedAt,
        database: meta?.database || null,
        host: meta?.host || null,
        port: meta?.port || null,
      };
    })
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  const latest = backups[0] || null;
  const latestAgeHours = latest ? backupAgeHoursOf(latest.modifiedAt) : null;

  return {
    ok: true,
    backupDir,
    backups,
    count: backups.length,
    totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
    latest,
    latestAgeHours,
    stale: latestAgeHours == null || latestAgeHours > STALE_AFTER_HOURS,
    staleAfterHours: STALE_AFTER_HOURS,
    checkedAt: new Date().toISOString(),
  };
}

function parseScriptOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return {};
  return JSON.parse(text);
}

export async function createLocalDbBackup(options = {}) {
  const root = rootOf(options);
  const scriptPath = resolve(root, 'prisma/local-db-backup.mjs');
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, 'create'], {
    cwd: root,
    env: process.env,
    timeout: options.timeoutMs || 120_000,
    maxBuffer: 1024 * 1024,
  });

  const created = parseScriptOutput(stdout);
  return {
    ok: true,
    created: created?.backup
      ? {
          ...created.backup,
          path: created.path || null,
          name: created.backup.file || basename(created.path || ''),
        }
      : created,
    stderr: String(stderr || '').trim() || null,
    status: listLocalDbBackups(options),
    checkedAt: new Date().toISOString(),
  };
}
