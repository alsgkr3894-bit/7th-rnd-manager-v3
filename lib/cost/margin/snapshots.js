/**
 * lib/cost/margin/snapshots.js — 원가 마진 추이 스냅샷 CRUD
 *
 * store: cost_margin_snapshots
 * 필드: id (autoIncrement), capturedAt (ISO string), label,
 *       avgCostRate, avgMargin, menuCount, source
 */
import { getAll, put, deleteById, hasStore } from '@/lib/db';

const STORE = 'cost_margin_snapshots';

/**
 * @param {object} data
 * @returns {{ capturedAt, label, avgCostRate, avgMargin, menuCount, source }}
 */
function buildRecord(data) {
  return {
    capturedAt:  data.capturedAt  || new Date().toISOString(),
    label:       (data.label      || '').trim(),
    avgCostRate: data.avgCostRate  ?? null,
    avgMargin:   data.avgMargin    ?? null,
    menuCount:   data.menuCount    ?? 0,
    source:      data.source       || '',
  };
}

/**
 * 모든 스냅샷을 capturedAt 오름차순으로 반환.
 * @returns {Promise<object[]>}
 */
export async function getAllSnapshots() {
  if (!hasStore(STORE)) return [];
  const all = await getAll(STORE);
  return all.slice().sort((a, b) => {
    const ta = a.capturedAt || '';
    const tb = b.capturedAt || '';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

/**
 * 스냅샷 저장 (신규 생성).
 * @param {object} data - { capturedAt?, label?, avgCostRate, avgMargin, menuCount, source? }
 * @returns {Promise<object|null>} 저장된 레코드 (id 포함), store 없으면 null
 */
export async function saveSnapshot(data) {
  if (!hasStore(STORE)) return null;
  const record = buildRecord(data);
  const id = await put(STORE, record); // put returns the stored key
  return { ...record, id };
}

/**
 * 스냅샷 삭제.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteSnapshot(id) {
  if (!hasStore(STORE)) return;
  return deleteById(STORE, id);
}
