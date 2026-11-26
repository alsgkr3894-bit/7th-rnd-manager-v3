/**
 * prisma/restore-verify-core.mjs — 백업 복원 검증의 순수 판정 함수
 */
import { basename, resolve, sep } from 'node:path';

export const TEMP_DIR_PREFIX = 'rnd-restore-verify-';
export const VERIFY_SIDECAR_SUFFIX = '.verify.json';

/** 복원 뒤 비어 있으면 안 되는 업무 저장소 */
export const REQUIRED_STORES = [
  'cost_ingredients',
  'menu_master',
  'menu_recipes',
  'cost_selling_prices',
  'price_files',
  'price_rows',
];

/** 파일 이름의 시각(pg_dump를 시작한 로컬 시각). 없으면 null */
export function dumpStartedAt(file) {
  const match = basename(String(file)).match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.dump$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  return new Date(y, mo - 1, d, h, mi, s);
}

/** 임시 DB가 운영 DB와 같은 서버를 가리키면 중단한다 */
export function assertIsolatedTarget(targetPort, productionUrl) {
  const port = Number(targetPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`임시 DB 포트가 올바르지 않습니다: ${targetPort}`);
  }
  const productionPort = Number(productionUrl ? new URL(productionUrl).port || 5432 : 5432);
  if (port === productionPort || port === 5432) {
    throw new Error(`임시 DB 포트(${port})가 운영 DB 포트와 겹칩니다.`);
  }
  return port;
}

/** 이 도구가 만든 임시 폴더만 지운다 */
export function isOwnTempDir(dir, tempRoot) {
  const full = resolve(String(dir || ''));
  return full.startsWith(resolve(tempRoot) + sep) && basename(full).startsWith(TEMP_DIR_PREFIX);
}

const keyOf = row => `${row.brandId}\u0000${row.storeName}\u0000${row.recordKey}`;

/**
 * 복원한 행과 현재 운영 행을 비교한다. 백업을 시작한 뒤에 운영에서 바뀐 것은 정상이고,
 * 그 전부터 있던 행이 다르거나 복원본에 없으면 설명되지 않는 차이다.
 * 행: { brandId, storeName, recordKey, hash, createdAt, updatedAt } (시각은 epoch 초)
 */
export function compareStoreRows(restored, live, snapshotEpoch) {
  const liveByKey = new Map(live.map(row => [keyOf(row), row]));
  const result = {
    identical: 0,
    changedAfterBackup: [],
    addedAfterBackup: [],
    onlyInBackup: [],
    unexplained: [],
  };
  const brief = (row, reason) => ({
    brandId: row.brandId,
    storeName: row.storeName,
    recordKey: row.recordKey,
    ...(reason ? { reason } : {}),
  });

  for (const row of restored) {
    const key = keyOf(row);
    const current = liveByKey.get(key);
    if (!current) {
      // 백업 뒤에 지웠을 수 있다 — 삭제 시각은 남지 않아 따로 보고한다
      result.onlyInBackup.push(brief(row));
      continue;
    }
    liveByKey.delete(key);
    if (current.hash === row.hash) result.identical += 1;
    else if (current.updatedAt >= snapshotEpoch) result.changedAfterBackup.push(brief(current));
    else result.unexplained.push(brief(current, '백업 전에 마지막으로 바뀐 행의 내용이 다름'));
  }
  for (const row of liveByKey.values()) {
    if (row.createdAt >= snapshotEpoch) result.addedAfterBackup.push(brief(row));
    else result.unexplained.push(brief(row, '백업 전에 만든 행이 복원본에 없음'));
  }
  return result;
}

/** [{ storeName, count }] 형태로 많은 순 요약 */
export function countByStore(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.storeName, (counts.get(row.storeName) || 0) + 1);
  return [...counts]
    .map(([storeName, count]) => ({ storeName, count }))
    .sort((a, b) => b.count - a.count);
}

export function summarizeComparison(comparison) {
  return {
    identical: comparison.identical,
    changedAfterBackup: countByStore(comparison.changedAfterBackup),
    addedAfterBackup: countByStore(comparison.addedAfterBackup),
    onlyInBackup: countByStore(comparison.onlyInBackup),
    unexplainedCount: comparison.unexplained.length,
    unexplainedSamples: comparison.unexplained.slice(0, 20),
  };
}

export const allPassed = checks => checks.length > 0 && checks.every(check => check.ok);
