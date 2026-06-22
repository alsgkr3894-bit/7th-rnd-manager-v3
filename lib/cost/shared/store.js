/** 레시피 store 공통 유틸 */

import { deleteById, hasStore } from '@/lib/db';
import { _getDB } from '@/lib/db/init';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { assertActiveAdmin } from '@/lib/auth/guard';

const DEFAULT_COST_UPLOAD_LOG_RETENTION_DAYS = 90;

export function normalizeCostUploadLogRetentionDays(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_COST_UPLOAD_LOG_RETENTION_DAYS;
}

function optionalFiniteNumber(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * cost_upload_log 보존 기간 초과 항목 정리.
 * keepDays(기본 90일) 이전에 생성된 로그를 삭제한다.
 *
 * cost_upload_log에는 'uploadedAt' 인덱스가 있으므로
 * IDBKeyRange 상한 커서를 사용해 풀스캔 없이 대상 행만 수집한다.
 * 인덱스가 실제 존재하지 않는 경우(구형 DB) 조용히 skip한다.
 *
 * @param {number} [keepDays=90] - 보존 일수
 */
export async function pruneOldCostUploadLogs(keepDays = 90) {
  await assertActiveAdmin('원가 업로드 로그 보존기간 정리');
  if (!hasStore('cost_upload_log')) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - normalizeCostUploadLogRetentionDays(keepDays));

  // uploadedAt 인덱스가 있으면 범위 커서로 대상 id만 수집 (풀스캔 회피)
  let idsToDelete;
  try {
    idsToDelete = await new Promise((resolve, reject) => {
      const db = _getDB();
      const tx = db.transaction('cost_upload_log', 'readonly');
      const store = tx.objectStore('cost_upload_log');
      const index = store.index('uploadedAt');
      // cutoff 미만 (상한 exclusive) 범위
      const range = IDBKeyRange.upperBound(cutoff.toISOString(), true);
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result.map(r => r.id));
      req.onerror = () => reject(req.error);
    });
  } catch {
    // 인덱스 없거나 구형 환경: 결과 없음으로 처리 (삭제 skip)
    return;
  }

  for (const id of idsToDelete) await deleteById('cost_upload_log', id);
}

export function normalizeComponent(c) {
  return {
    productCode: (c.productCode || '').trim() || null,
    ingredientName: (c.ingredientName || '').trim(),
    quantity: optionalFiniteNumber(c.quantity),
    unit: normalizeCostBaseUnit(c.unit),
    unitPrice: optionalFiniteNumber(c.unitPrice),
    note: (c.note || '').trim(),
  };
}
