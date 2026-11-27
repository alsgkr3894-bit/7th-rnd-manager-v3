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
  return resolve(
    rootOf(options),
    options.backupDir || process.env.DB_BACKUP_DIR || DEFAULT_BACKUP_DIR
  );
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

/** `npm run db:restore:verify`가 남긴 결과 중 화면에 필요한 값만 (경로·내용은 내보내지 않는다) */
function readVerification(path) {
  try {
    const parsed = JSON.parse(readFileSync(`${path}.verify.json`, 'utf8'));
    if (typeof parsed?.verifiedAt !== 'string') return null;
    return { verifiedAt: parsed.verifiedAt, ok: parsed.ok === true };
  } catch {
    return null;
  }
}

/** 다른 드라이브 사본의 상태 — 폴더 경로는 내보내지 않는다 */
function readCopyStatus(backupDir) {
  try {
    const path = join(/* turbopackIgnore: true */ backupDir, 'copy-status.json');
    const status = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof status?.checkedAt !== 'string') return null;
    return {
      ok: status.ok === true,
      reason: String(status.reason || ''),
      checkedAt: status.checkedAt,
      lastSuccessAt: typeof status.lastSuccessAt === 'string' ? status.lastSuccessAt : null,
      latestName: status.latest ? publicBackupName(status.latest) : null,
    };
  } catch {
    return null;
  }
}

function backupAgeHoursOf(modifiedAt) {
  const time = new Date(modifiedAt).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / 3_600_000);
}

function publicBackupName(name) {
  const timestamp = String(name || '').match(/(\d{8}-\d{6})\.dump$/)?.[1];
  return timestamp ? `backup-${timestamp}.dump` : 'backup.dump';
}

export function listLocalDbBackups(options = {}) {
  const backupDir = backupDirOf(options);
  if (!existsSync(/* turbopackIgnore: true */ backupDir)) {
    return {
      ok: true,
      backups: [],
      count: 0,
      totalSize: 0,
      latest: null,
      lastVerified: null,
      copy: null,
      stale: true,
      checkedAt: new Date().toISOString(),
    };
  }

  const backups = readdirSync(/* turbopackIgnore: true */ backupDir)
    .filter(name => name.endsWith('.dump'))
    .map(name => {
      const path = join(/* turbopackIgnore: true */ backupDir, name);
      const stat = statSync(/* turbopackIgnore: true */ path);
      const meta = readJsonSidecar(path);
      const modifiedAt = stat.mtime.toISOString();
      return {
        name: publicBackupName(name),
        size: stat.size,
        modifiedAt,
        createdAt: meta?.createdAt || modifiedAt,
        hasMeta: meta != null,
        verification: readVerification(path),
      };
    })
    // 0바이트이거나 사이드카(.json)가 없는 파일은 실패한 pg_dump가 남긴 잔해다 — 이걸
    // "최신 백업"으로 세면 홈 대시보드가 실제로는 빈 백업뿐인데도 정상으로 표시한다
    // (2026-09-14~18에 실제로 4번 발생: prisma/local-db-backup.mjs 참고).
    .filter(backup => backup.size > 0 && backup.hasMeta)
    .map(({ hasMeta, ...backup }) => backup)
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  const latest = backups[0] || null;
  // 가장 최근에 성공한 복원 검증 — 어느 백업을 언제 확인했는지
  const lastVerified =
    backups
      .filter(backup => backup.verification?.ok)
      .sort((a, b) => b.verification.verifiedAt.localeCompare(a.verification.verifiedAt))
      .map(backup => ({ name: backup.name, verifiedAt: backup.verification.verifiedAt }))[0] ||
    null;
  const latestAgeHours = latest ? backupAgeHoursOf(latest.modifiedAt) : null;

  return {
    ok: true,
    backups,
    count: backups.length,
    totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
    latest,
    lastVerified,
    copy: readCopyStatus(backupDir),
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

export class BackupBusyError extends Error {
  constructor() {
    super('다른 백업이 진행 중입니다. 잠시 뒤 다시 시도해 주세요.');
    this.name = 'BackupBusyError';
  }
}

export async function createLocalDbBackup(options = {}) {
  const root = rootOf(options);
  const scriptPath = resolve(root, 'prisma/local-db-backup.mjs');
  const run = options.execFile || execFileAsync;
  let stdout;
  try {
    ({ stdout } = await run(process.execPath, [scriptPath, 'create'], {
      cwd: root,
      env: process.env,
      // 다른 드라이브에 사본을 옮기는 시간까지 기다린다
      timeout: options.timeoutMs || 300_000,
      maxBuffer: 1024 * 1024,
    }));
  } catch (error) {
    // 잠금 판정은 스크립트가 한다(자동 백업 프로세스와도 겹치지 않게)
    if (String(error?.stderr || error?.message).includes('BACKUP_IN_PROGRESS')) {
      throw new BackupBusyError();
    }
    throw error;
  }

  const created = parseScriptOutput(stdout);
  return {
    ok: true,
    created: created?.backup
      ? {
          name: publicBackupName(created.backup.file || basename(created.path || '')),
          createdAt: created.backup.createdAt || null,
          size: created.backup.size || 0,
        }
      : created,
    status: listLocalDbBackups(options),
    checkedAt: new Date().toISOString(),
  };
}
