/**
 * lib/cost/edge-dough/store.js — cost_edge_dough CRUD
 *
 * 레코드 구조:
 *   id          autoIncrement PK
 *   edgeCode    'ED-CC-L', 'ED-GS-R', 'ED-TH-L' 등
 *   edgeType    '치즈크러스트' | '골드스윗크러스트' | '씬도우'
 *   size        'L' | 'R'
 *   components  [{ productCode?, ingredientName, quantity, unit, unitPrice }]
 *   note        string
 *   updatedAt   ISO
 *
 * 총 원가는 저장하지 않음 — calc.js의 edgeTotalCost로 계산.
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { EDGE_DOUGH_SEED, edgeCodeOf, defaultExpandInMargin, defaultMarginSuffix } from './template';
import { normalizeComponent } from '@/lib/cost/shared/store';

const STORE = 'cost_edge_dough';
const s = (tx) => tx.objectStore(STORE);

/** 엣지 정렬 — 치즈→골드→씬 / L→R */
const TYPE_ORDER = { '치즈크러스트': 1, '골드스윗크러스트': 2, '씬도우': 3 };

export async function getAllEdges() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => {
    const ta = TYPE_ORDER[a.edgeType] ?? 99, tb = TYPE_ORDER[b.edgeType] ?? 99;
    if (ta !== tb) return ta - tb;
    return (a.size || '').localeCompare(b.size || '');
  });
}

export async function upsertEdge(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);

  if (data.id) {
    const existing = all.find(r => r.id === data.id);
    if (!existing) throw new Error('항목을 찾을 수 없습니다');
    await runTransaction([STORE], 'readwrite', tx => {
      s(tx).put({ ...existing, ...buildRecord(data), id: data.id });
    });
    return { id: data.id, mode: 'update' };
  }

  // edgeType+size 중복 → 기존 항목 갱신 (다른 upsert 함수와 동일 규칙)
  const dup = all.find(r => r.edgeType === data.edgeType && r.size === data.size);
  if (dup) {
    await runTransaction([STORE], 'readwrite', tx => {
      s(tx).put({ ...dup, ...buildRecord(data), id: dup.id });
    });
    return { id: dup.id, mode: 'update' };
  }

  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = s(tx).add(buildRecord(data));
    req.onsuccess = () => { insertedId = req.result; };
  });
  return { id: insertedId, mode: 'insert' };
}

export async function deleteEdge(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });
}

export async function resetAllEdges() {
  if (!hasStore(STORE)) return { deleted: 0 };
  const all = await getAll(STORE);
  const count = all.length;
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).clear();
  });
  return { deleted: count };
}

/**
 * 마스터 시드 — 5종 기본 항목 일괄 등록 (이미 있는 항목은 skip).
 */
export async function seedEdges() {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const existing = await getAll(STORE);
  const existingKeys = new Set(existing.map(r => `${r.edgeType}|${r.size}`));
  const toAdd = EDGE_DOUGH_SEED.filter(it => !existingKeys.has(`${it.edgeType}|${it.size}`));
  if (toAdd.length === 0) return { inserted: 0, total: existing.length };
  await runTransaction([STORE], 'readwrite', tx => {
    const store = tx.objectStore(STORE);
    for (const it of toAdd) store.add(buildRecord(it));
  });
  return { inserted: toAdd.length, total: existing.length + toAdd.length };
}

function buildRecord(data) {
  const edgeType = (data.edgeType || '').trim();
  const size     = (data.size || '').trim();
  return {
    edgeCode:   data.edgeCode || edgeCodeOf(edgeType, size),
    edgeType,
    size,
    components: Array.isArray(data.components) ? data.components.map(normalizeComponent) : [],
    note:       (data.note || '').trim(),
    // 마진표 파생행 노출 여부·접미사 (미지정 시 유형 기본값)
    expandInMargin: data.expandInMargin != null ? !!data.expandInMargin : defaultExpandInMargin(edgeType),
    marginSuffix:   (data.marginSuffix || '').trim() || defaultMarginSuffix(edgeType),
    updatedAt:  new Date().toISOString(),
  };
}

