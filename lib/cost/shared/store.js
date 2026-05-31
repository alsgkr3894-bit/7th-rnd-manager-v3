/** 레시피 store 공통 유틸 */

import { getAll, deleteById, hasStore } from '@/lib/db';

/**
 * cost_upload_log 보존 기간 초과 항목 정리.
 * keepDays(기본 90일) 이전에 생성된 로그를 삭제한다.
 *
 * @param {number} [keepDays=90] - 보존 일수
 */
export async function pruneOldCostUploadLogs(keepDays = 90) {
  if (!hasStore('cost_upload_log')) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const all = await getAll('cost_upload_log');
  const old = all.filter(r => new Date(r.createdAt || r.at || r.uploadedAt) < cutoff);
  for (const r of old) await deleteById('cost_upload_log', r.id);
}

export function normalizeComponent(c) {
  return {
    productCode:    (c.productCode || '').trim() || null,
    ingredientName: (c.ingredientName || '').trim(),
    quantity:       c.quantity != null && c.quantity !== '' ? Number(c.quantity) : null,
    unit:           (c.unit || 'g').trim(),
    unitPrice:      c.unitPrice != null && c.unitPrice !== '' ? Number(c.unitPrice) : null,
    note:           (c.note || '').trim(),
  };
}
