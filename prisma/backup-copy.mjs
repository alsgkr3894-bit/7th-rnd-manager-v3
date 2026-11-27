/**
 * prisma/backup-copy.mjs — DB 백업을 다른 드라이브에도 복사한다 (DB_BACKUP_COPY_DIR)
 *
 * - 대상 폴더는 만들지 않는다. 없으면(USB를 뺐거나 드라이브 문자가 바뀐 경우) 건너뛰고 기록한다.
 * - 복사 뒤 원본과 내용(SHA-256)이 같은지 확인하고 나서 백업 이름을 붙인다.
 * - 대상 폴더에서는 우리가 만든 이름의 백업만 정리한다.
 * - 복사가 실패해도 원본 백업은 성공이다.
 */
import { createHash } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

export const COPY_STATUS_FILE = 'copy-status.json';
const DUMP_NAME = /^[A-Za-z0-9_-]+-(\d{8}-\d{6})\.dump$/;
const SIDECARS = ['.json', '.verify.json'];
const HASH_CHUNK = 4 * 1024 * 1024;

function sha256File(path) {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(HASH_CHUNK);
  const handle = openSync(path, 'r');
  try {
    for (;;) {
      const read = readSync(handle, buffer, 0, buffer.length, null);
      if (read === 0) break;
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    closeSync(handle);
  }
  return hash.digest('hex');
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isCopied(file, targetDir) {
  const target = join(targetDir, file.name);
  try {
    return statSync(target).size === file.size && existsSync(`${target}.json`);
  } catch {
    return false;
  }
}

function copySidecars(file, targetDir) {
  for (const suffix of SIDECARS) {
    const source = `${file.path}${suffix}`;
    if (existsSync(source)) copyFileSync(source, join(targetDir, `${file.name}${suffix}`));
  }
}

function copyDump(file, targetDir) {
  const target = join(targetDir, file.name);
  const partial = `${target}.partial`;
  try {
    copyFileSync(file.path, partial);
    if (sha256File(partial) !== sha256File(file.path)) {
      throw new Error('복사한 파일의 내용이 원본과 다릅니다');
    }
    renameSync(partial, target);
  } finally {
    rmSync(partial, { force: true });
  }
  copySidecars(file, targetDir);
}

function pruneTarget(targetDir, keep) {
  const dumps = readdirSync(targetDir)
    .filter(name => DUMP_NAME.test(name) && existsSync(join(targetDir, `${name}.json`)))
    .sort((a, b) => b.match(DUMP_NAME)[1].localeCompare(a.match(DUMP_NAME)[1]));
  for (const name of dumps.slice(keep)) {
    for (const suffix of ['', ...SIDECARS]) {
      rmSync(join(targetDir, `${name}${suffix}`), { force: true });
    }
  }
}

function removePartials(targetDir) {
  for (const name of readdirSync(targetDir)) {
    if (name.endsWith('.partial') && DUMP_NAME.test(name.slice(0, -'.partial'.length))) {
      rmSync(join(targetDir, name), { force: true });
    }
  }
}

function previousStatus(sourceDir) {
  try {
    return JSON.parse(readFileSync(join(sourceDir, COPY_STATUS_FILE), 'utf8'));
  } catch {
    return null;
  }
}

function record(sourceDir, result) {
  const checkedAt = new Date().toISOString();
  const status = {
    configured: true,
    ...result,
    checkedAt,
    lastSuccessAt: result.ok ? checkedAt : (previousStatus(sourceDir)?.lastSuccessAt ?? null),
  };
  try {
    writeFileSync(join(sourceDir, COPY_STATUS_FILE), `${JSON.stringify(status, null, 2)}\n`);
  } catch {
    console.warn('[backup] 사본 상태를 기록하지 못했습니다.');
  }
  return status;
}

/**
 * @param {{ files: Array<{name: string, path: string, size: number}>, sourceDir: string,
 *           targetDir?: string, keep: number, limit?: number }} input files는 최신순
 */
export function syncBackupCopy({ files, sourceDir, targetDir, keep, limit = Infinity }) {
  if (!targetDir) return { configured: false };
  const target = resolve(targetDir);
  if (target === resolve(sourceDir)) {
    return record(sourceDir, { ok: false, reason: 'same-folder', copied: 0, latest: null });
  }
  if (!isDirectory(target)) {
    return record(sourceDir, { ok: false, reason: 'unavailable', copied: 0, latest: null });
  }

  const wanted = files.slice(0, keep);
  let copied = 0;
  try {
    removePartials(target);
    for (const file of wanted) {
      if (copied >= limit) break;
      if (isCopied(file, target)) {
        copySidecars(file, target);
        continue;
      }
      copyDump(file, target);
      copied += 1;
    }
    const newest = wanted[0];
    const ok = Boolean(newest) && isCopied(newest, target);
    if (ok) pruneTarget(target, keep);
    return record(sourceDir, {
      ok,
      reason: ok ? 'ok' : 'no-backup',
      copied,
      latest: ok ? newest.name : null,
    });
  } catch (error) {
    console.warn(`[backup] 사본 복사 실패: ${error?.message || error}`);
    return record(sourceDir, { ok: false, reason: 'failed', copied, latest: null });
  }
}
