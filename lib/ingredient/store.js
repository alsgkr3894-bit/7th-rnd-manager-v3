/**
 * lib/ingredient/store.js — cost_ingredients CRUD
 *
 * 레코드 구조:
 *   id            autoIncrement PK
 *   ingredientName 재료명 (직접 입력 or 제때 productName)
 *   productCode    제때 제품코드 (null = 수동 등록)
 *   category       분류
 *   baseQuantity   포장단위 수량
 *   baseUnitType   단위 (g | kg | L | ml | 개 …)
 *   taxType        '과세' | '면세'
 *   priceOverride  수동 단가(부가세포함) — 제때 연동 없을 때 사용
 *   note           비고
 *   isManual       true = 수동 등록
 *   updatedAt      ISO
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

function store(tx) { return tx.objectStore('cost_ingredients'); }

// ── 조회 ─────────────────────────────────────────────────────

export async function getAllIngredients() {
  if (!hasStore('cost_ingredients')) return [];
  const rows = await getAll('cost_ingredients');
  return rows.sort((a, b) => {
    const ca = a.category || 'ㅎ', cb = b.category || 'ㅎ';
    if (ca !== cb) return ca.localeCompare(cb, 'ko');
    return (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko');
  });
}

/** productCode → 메타 Map (리스트 페이지용) */
export async function getIngredientMetaMap() {
  if (!hasStore('cost_ingredients')) return new Map();
  const rows = await getAll('cost_ingredients');
  return new Map(rows.filter(r => r.productCode).map(r => [r.productCode, r]));
}

// ── 추가 ─────────────────────────────────────────────────────

export async function addIngredient(data) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const record = buildRecord(data);
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).add(record);
  });
}

// ── 수정 ─────────────────────────────────────────────────────

export async function updateIngredient(id, data) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('항목을 찾을 수 없습니다');
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put({ ...existing, ...buildRecord(data), id });
  });
}

/** 제때 리스트에서 인라인 메타 저장 (productCode 기준 upsert) */
export async function upsertIngredientMeta({ productCode, ...patch }) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = all.find(r => r.productCode === productCode);
  const record = {
    ...(existing || {}),
    productCode,
    ingredientName: patch.ingredientName ?? existing?.ingredientName ?? '',
    category:     patch.category     ?? existing?.category     ?? '',
    baseQuantity: patch.baseQuantity != null ? Number(patch.baseQuantity) : existing?.baseQuantity ?? null,
    baseUnitType: patch.baseUnitType ?? existing?.baseUnitType ?? 'g',
    taxType:      patch.taxType      ?? existing?.taxType      ?? '과세',
    note:         patch.note         ?? existing?.note         ?? '',
    isManual:     false,
    updatedAt: new Date().toISOString(),
  };
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put(record);
  });
}

// ── 삭제 ─────────────────────────────────────────────────────

export async function deleteIngredient(id) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).delete(id);
  });
}

// ── 내부 헬퍼 ────────────────────────────────────────────────

function buildRecord(data) {
  return {
    ingredientName: (data.ingredientName || '').trim(),
    productCode:    (data.productCode    || '').trim() || null,
    category:       data.category     || '',
    baseQuantity:   data.baseQuantity  != null ? Number(data.baseQuantity)  : null,
    baseUnitType:   data.baseUnitType  || 'g',
    taxType:        data.taxType       || '과세',
    priceOverride:  data.priceOverride != null ? Number(data.priceOverride) : null,
    note:           (data.note || '').trim(),
    isManual:       data.isManual ?? true,
    updatedAt: new Date().toISOString(),
  };
}
