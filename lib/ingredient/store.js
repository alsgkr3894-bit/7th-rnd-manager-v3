/**
 * lib/ingredient/store.js — cost_ingredients CRUD
 *
 * 레코드 구조:
 *   id            autoIncrement PK
 *   ingredientName 재료명 (직접 입력 or 제때 productName)
 *   productCode    제때 제품코드 (null = 수동 등록)
 *   categories     분류 태그 배열 (예: ['토핑재료', '육가공류'])
 *   category       (deprecated, backward compat) categories[0]
 *   manufacturer   제조사
 *   discontinued   단종 여부 (true = 단종 카테고리에만 표시)
 *   baseQuantity   포장단위 수량
 *   baseUnitType   단위 (g | kg | L | ml | 개 …)
 *   taxType        '과세' | '면세'
 *   priceOverride  수동 단가(부가세포함) — 제때 연동 없을 때 사용
 *   note           비고
 *   isManual       true = 수동 등록
 *   isSeeded       true = 마스터 시드에서 자동 등록
 *   updatedAt      ISO
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

function store(tx) { return tx.objectStore('cost_ingredients'); }

// ── 조회 ─────────────────────────────────────────────────────

export async function getAllIngredients() {
  if (!hasStore('cost_ingredients')) return [];
  const rows = await getAll('cost_ingredients');
  return rows.sort((a, b) => {
    const ca = (a.categories?.[0] || a.category || 'ㅎ');
    const cb = (b.categories?.[0] || b.category || 'ㅎ');
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
  const categories = normalizeCategories(patch.categories ?? existing?.categories ?? (existing?.category ? [existing.category] : []));
  const record = {
    ...(existing || {}),
    productCode,
    ingredientName: patch.ingredientName ?? existing?.ingredientName ?? '',
    categories,
    category:     categories[0] || '',
    manufacturer: patch.manufacturer ?? existing?.manufacturer ?? '',
    discontinued: patch.discontinued ?? existing?.discontinued ?? false,
    baseQuantity: patch.baseQuantity != null ? Number(patch.baseQuantity) : existing?.baseQuantity ?? null,
    baseUnitType: patch.baseUnitType ?? existing?.baseUnitType ?? 'g',
    taxType:      patch.taxType      ?? existing?.taxType      ?? '과세',
    note:         patch.note         ?? existing?.note         ?? '',
    isManual:     existing?.isManual ?? false,
    isSeeded:     existing?.isSeeded ?? false,
    updatedAt: new Date().toISOString(),
  };
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put(record);
  });
}

// ── 리스트에서 숨기기 / 복원 (제때 연동 항목 전용) ───────────

export async function excludeIngredientByCode(productCode) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = all.find(r => r.productCode === productCode) || {};
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put({ ...existing, productCode, excluded: true, isManual: false, updatedAt: new Date().toISOString() });
  });
}

export async function restoreIngredientByCode(productCode) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = all.find(r => r.productCode === productCode);
  if (!existing) return;
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put({ ...existing, excluded: false, updatedAt: new Date().toISOString() });
  });
}

// ── 삭제 ─────────────────────────────────────────────────────

export async function deleteIngredient(id) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).delete(id);
  });
}

// ── 마스터 시드 ──────────────────────────────────────────────

/**
 * 마스터 시드 적용 — INGREDIENT_MASTER_SEED를 cost_ingredients에 일괄 upsert
 * productCode 기준 매칭, 기존 항목은 master 필드만 갱신(가격/포장단위는 보존)
 * @returns {Promise<{ inserted:number, updated:number, total:number }>}
 */
export async function seedMasterIngredients(items) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  if (!Array.isArray(items) || !items.length) return { inserted: 0, updated: 0, total: 0 };
  const all = await getAll('cost_ingredients');
  const byCode = new Map(all.filter(r => r.productCode).map(r => [r.productCode, r]));
  const now = new Date().toISOString();
  let inserted = 0, updated = 0;
  const records = items.map(it => {
    const existing = byCode.get(it.productCode);
    const categories = normalizeCategories(it.categories);
    const base = {
      ...(existing || {}),
      productCode:   it.productCode,
      ingredientName: existing?.ingredientName?.trim() || it.productName,
      categories,
      category:      categories[0] || '',
      manufacturer:  it.manufacturer || existing?.manufacturer || '',
      discontinued:  it.discontinued === true,
      taxType:       existing?.taxType || '과세',
      baseQuantity:  existing?.baseQuantity ?? null,
      baseUnitType:  existing?.baseUnitType || 'g',
      note:          existing?.note || '',
      isManual:      false,
      isSeeded:      true,
      updatedAt:     now,
    };
    if (existing) updated++; else inserted++;
    return base;
  });
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const s = store(tx);
    for (const r of records) s.put(r);
  });
  return { inserted, updated, total: records.length };
}

// ── 내부 헬퍼 ────────────────────────────────────────────────

function normalizeCategories(input) {
  if (Array.isArray(input)) return input.map(c => String(c).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split(',').map(c => c.trim()).filter(Boolean);
  return [];
}

function buildRecord(data) {
  const categories = normalizeCategories(data.categories ?? data.category);
  return {
    ingredientName: (data.ingredientName || '').trim(),
    productCode:    (data.productCode    || '').trim() || null,
    categories,
    category:       categories[0] || '',
    manufacturer:   (data.manufacturer  || '').trim(),
    discontinued:   data.discontinued === true,
    baseQuantity:   data.baseQuantity  != null && data.baseQuantity !== '' ? Number(data.baseQuantity)  : null,
    baseUnitType:   data.baseUnitType  || 'g',
    taxType:        data.taxType       || '과세',
    priceOverride:  data.priceOverride != null && data.priceOverride !== '' ? Number(data.priceOverride) : null,
    note:           (data.note || '').trim(),
    isManual:       data.isManual ?? true,
    isSeeded:       data.isSeeded === true,
    updatedAt: new Date().toISOString(),
  };
}
