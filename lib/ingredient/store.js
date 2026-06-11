/**
 * lib/ingredient/store.js — cost_ingredients CRUD
 *
 * 레코드 구조:
 *   id            autoIncrement PK
 *   ingredientName 재료명 (직접 입력 or 제때 productName)
 *   productCode    제때 제품코드 (null = 수동 등록)
 *   category       메인 분류 1개 (예: '토핑재료', '엣지', '사이드')
 *   tags           서브 해시태그 배열 (예: ['육가공류', '수산류'])
 *   manufacturer   제조사
 *   discontinued   단종 여부
 *   baseQuantity   포장단위 수량
 *   baseUnitType   단위 (g | kg | L | ml | 개 …)
 *   taxType        '과세' | '면세'
 *   priceOverride  수동 단가(부가세포함) — 제때 연동 없을 때 사용
 *   note           비고
 *   isManual       true = 수동 등록
 *   isSeeded       true = 마스터 시드에서 자동 등록
 *   updatedAt      ISO
 *
 *   (deprecated, backward compat) categories: string[] — category + tags 합본
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { logWork } from '@/lib/work-log';
import { getActiveBrandId } from '@/lib/active-brand';
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';
// nutrition 모듈은 삭제 cascade 시에만 필요 — eager 결합을 피하려 deleteIngredient 내부에서 동적 import.

function store(tx) {
  return tx.objectStore('cost_ingredients');
}

// ── compositeOf 참조 검증 ─────────────────────────────────────

/**
 * 순수 함수: compositeOf 코드 목록 중 existingCodes Set에 없는 것을 반환.
 * 비교는 trim + 소문자 기준 (case-insensitive).
 *
 * @param {string[]} compositeOf
 * @param {Set<string>} existingCodes  — 소문자 trim된 productCode 집합
 * @returns {string[]} 존재하지 않는 원래 코드 목록
 */
export function findMissingRefs(compositeOf, existingCodes) {
  if (!Array.isArray(compositeOf) || compositeOf.length === 0) return [];
  return compositeOf.filter(c => {
    const key = String(c).trim().toLowerCase();
    return key !== '' && !existingCodes.has(key);
  });
}

/**
 * cost_ingredients에서 compositeOf 배열의 productCode 참조를 베스트-에포트로 검증.
 *
 * - store가 없으면 { ok: true, missing: [] } (non-blocking 보장).
 * - compositeOf가 비어 있거나 없으면 즉시 { ok: true, missing: [] }.
 * - throw하지 않는다 — 예외가 발생해도 { ok: true, missing: [] } 를 반환.
 *
 * UI(등록 모달 등)에서 저장 전 경고를 표시할 때 사용:
 *   const { ok, missing } = await validateCompositeRefs(compositeOf);
 *   if (!ok) showWarn(`참조 코드 없음: ${missing.join(', ')}`);
 *
 * @param {string[] | null | undefined} compositeOf
 * @param {Set<string> | null} [existingCodesSet] - 호출자가 이미 보유한 정규화된 productCode Set.
 *   전달하면 cost_ingredients 전체 조회(getAll)를 건너뛴다 (반복 호출 시 성능 개선).
 *   소문자·trim 정규화된 코드여야 한다.
 * @returns {Promise<{ ok: boolean, missing: string[] }>}
 */
export async function validateCompositeRefs(compositeOf, existingCodesSet = null) {
  try {
    if (!Array.isArray(compositeOf) || compositeOf.length === 0) return { ok: true, missing: [] };
    let existingCodes = existingCodesSet;
    if (!(existingCodes instanceof Set)) {
      if (!hasStore('cost_ingredients')) return { ok: true, missing: [] };
      const all = await getAll('cost_ingredients');
      existingCodes = new Set(
        all.filter(r => r.productCode).map(r => String(r.productCode).trim().toLowerCase())
      );
    }
    const missing = findMissingRefs(compositeOf, existingCodes);
    return { ok: missing.length === 0, missing };
  } catch {
    return { ok: true, missing: [] };
  }
}

export function productCodeKey(productCode) {
  return String(productCode || '')
    .trim()
    .toLowerCase();
}

function ingredientKeepRank(row) {
  if (row?.excluded) return 2;
  if (row?.discontinued) return 1;
  return 0;
}

function compareIngredientKeep(a, b) {
  const rankDiff = ingredientKeepRank(a) - ingredientKeepRank(b);
  if (rankDiff !== 0) return rankDiff;
  const ta = Date.parse(a?.updatedAt || '');
  const tb = Date.parse(b?.updatedAt || '');
  const ua = Number.isFinite(ta) ? ta : 0;
  const ub = Number.isFinite(tb) ? tb : 0;
  if (ub !== ua) return ub - ua;
  return (Number(b?.id) || 0) - (Number(a?.id) || 0);
}

function recordsByProductCode(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = productCodeKey(row?.productCode);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function findIngredientByProductCode(rows, productCode) {
  const group = recordsByProductCode(rows).get(productCodeKey(productCode)) || [];
  return [...group].sort(compareIngredientKeep)[0] || null;
}

function findIngredientsByProductCode(rows, productCode) {
  return recordsByProductCode(rows).get(productCodeKey(productCode)) || [];
}

function assertUniqueProductCode(rows, productCode, currentId = null) {
  const key = productCodeKey(productCode);
  if (!key) return;
  const duplicate = (Array.isArray(rows) ? rows : []).find(row => {
    if (productCodeKey(row?.productCode) !== key) return false;
    if (currentId == null) return true;
    return Number(row.id) !== Number(currentId);
  });
  if (duplicate) {
    throw new Error(`이미 등록된 제품코드입니다: ${String(productCode).trim()}`);
  }
}

export function buildIngredientProductCodeDuplicateDiagnostics(
  rows = [],
  nutritionValues = []
) {
  const nutritionCodeSet = new Set(
    (Array.isArray(nutritionValues) ? nutritionValues : [])
      .map(row => productCodeKey(row?.productCode))
      .filter(Boolean)
  );
  const groups = [...recordsByProductCode(rows).entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      const ordered = [...items].sort(compareIngredientKeep);
      const keep = ordered[0];
      const remove = ordered.slice(1);
      return {
        key,
        productCode: String(keep?.productCode || items[0]?.productCode || '').trim(),
        count: items.length,
        keepId: keep?.id ?? null,
        keepName: keep?.ingredientName || keep?.productName || keep?.displayName || '',
        removeIds: remove.map(row => row.id).filter(id => id != null),
        removeNames: remove.map(row => row.ingredientName || row.productName || row.displayName || ''),
        hasNutritionValue: nutritionCodeSet.has(key),
      };
    });
  const duplicateRows = groups.reduce((sum, group) => sum + Math.max(0, group.count - 1), 0);
  return {
    groups,
    groupCount: groups.length,
    duplicateRows,
    hasDuplicates: duplicateRows > 0,
  };
}

function firstPresent(rows, key) {
  for (const row of rows) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function mergeDuplicateIngredientRecord(keep, removeRows, now) {
  const rows = [keep, ...removeRows];
  const merged = { ...keep, updatedAt: now };
  const fillKeys = [
    'ingredientName',
    'category',
    'manufacturer',
    'baseQuantity',
    'baseUnitType',
    'taxType',
    'priceOverride',
    'supplierId',
    'supplierName',
    'temperature',
    'scope',
    'note',
    'origin',
    'photos',
    'photo',
  ];
  for (const key of fillKeys) {
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
      const value = firstPresent(rows, key);
      if (value !== undefined) merged[key] = value;
    }
  }
  merged.tags = [...new Set(rows.flatMap(row => normalizeTags(row?.tags ?? readTags(row))))];
  merged.allergens = [...new Set(rows.flatMap(row => (Array.isArray(row?.allergens) ? row.allergens : [])))];
  merged.photos = normalizeIngredientPhotos(merged.photos, merged.photo);
  merged.photo = getPrimaryIngredientPhoto(merged);
  merged.isManual = rows.some(row => row?.isManual === true);
  merged.isSeeded = rows.some(row => row?.isSeeded === true);
  merged.excluded = keep.excluded === true;
  merged.discontinued = keep.discontinued === true;
  delete merged.categories;
  return merged;
}

// ── 조회 ─────────────────────────────────────────────────────

/**
 * origin 값을 [{displayName, country}] 배열로 정규화.
 * - 구버전 { displayName, country, region } → 배열로 승격
 * - 이미 배열이면 유효 항목만 유지
 * - null/undefined → null
 */
function normalizeOrigin(v) {
  if (!v) return null;
  if (Array.isArray(v)) {
    const items = v
      .filter(it => it.country?.trim())
      .map(it => ({ displayName: (it.displayName || '').trim(), country: it.country.trim() }));
    return items.length ? items : null;
  }
  // 구버전 객체
  if (v.country?.trim()) {
    return [{ displayName: (v.displayName || '').trim(), country: v.country.trim() }];
  }
  return null;
}

export async function getAllIngredients() {
  if (!hasStore('cost_ingredients')) return [];
  const rows = await getAll('cost_ingredients');
  return rows
    .map(r => {
      const photos = normalizeIngredientPhotos(r.photos, r.photo);
      return {
        ...r,
        origin: normalizeOrigin(r.origin),
        photos,
        photo: getPrimaryIngredientPhoto({ photos, photo: r.photo }),
      };
    })
    .sort((a, b) => {
      const ca = a.category || 'ㅎ',
        cb = b.category || 'ㅎ';
      if (ca !== cb) return ca.localeCompare(cb, 'ko');
      return (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko');
    });
}

export async function getIngredientMetaMap() {
  if (!hasStore('cost_ingredients')) return new Map();
  const rows = await getAll('cost_ingredients');
  const map = new Map();
  for (const [, items] of recordsByProductCode(rows)) {
    const keep = [...items].sort(compareIngredientKeep)[0];
    if (!keep?.productCode) continue;
    for (const item of items) {
      if (item?.productCode) map.set(item.productCode, keep);
    }
  }
  return map;
}

// ── 추가 ─────────────────────────────────────────────────────

/**
 * 식자재를 새로 추가한다.
 * data.compositeOf 참조 검증은 {@link validateCompositeRefs}를 통해 UI에서 수행 가능.
 * 저장 시 참조가 누락돼 있으면 console.warn만 출력하며 저장은 그대로 진행된다.
 */
export async function addIngredient(data) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const record = buildRecord(data);
  if (record.productCode) {
    const all = await getAll('cost_ingredients');
    assertUniqueProductCode(all, record.productCode);
  }
  if (Array.isArray(data.compositeOf) && data.compositeOf.length) {
    validateCompositeRefs(data.compositeOf)
      .then(({ ok, missing }) => {
        if (!ok)
          console.warn('[ingredient/store] addIngredient: compositeOf 참조 코드 없음:', missing);
      })
      .catch(() => {});
  }
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).add(record);
  });
  logWork('INGREDIENT_SAVE', data.ingredientName || '식자재 등록').catch(e =>
    console.warn('[ingredient/store] logWork 실패', e)
  );
}

// ── 수정 ─────────────────────────────────────────────────────

/**
 * 기존 식자재를 수정한다.
 * data.compositeOf 참조 검증은 {@link validateCompositeRefs}를 통해 UI에서 수행 가능.
 * 저장 시 참조가 누락돼 있으면 console.warn만 출력하며 저장은 그대로 진행된다.
 */
export async function updateIngredient(id, data) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('항목을 찾을 수 없습니다');
  const nextRecord = buildRecord(data);
  if (nextRecord.productCode) assertUniqueProductCode(all, nextRecord.productCode, id);
  if (Array.isArray(data.compositeOf) && data.compositeOf.length) {
    validateCompositeRefs(data.compositeOf)
      .then(({ ok, missing }) => {
        if (!ok)
          console.warn('[ingredient/store] updateIngredient: compositeOf 참조 코드 없음:', missing);
      })
      .catch(e => console.warn('[ingredient/store] validateCompositeRefs 실패', e));
  }
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put({ ...existing, ...nextRecord, id });
  });
  logWork('INGREDIENT_SAVE', data.ingredientName || existing.ingredientName || '식자재 수정', {
    ref: id,
  }).catch(e => console.warn('[ingredient/store] logWork 실패', e));
}

export async function upsertIngredientMeta({ productCode, ...patch }) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = findIngredientByProductCode(all, productCode);
  const category = (patch.category ?? existing?.category ?? readCategory(existing) ?? '').trim();
  const tags = normalizeTags(patch.tags ?? existing?.tags ?? readTags(existing));
  const photos =
    patch.photos !== undefined || patch.photo !== undefined
      ? normalizeIngredientPhotos(patch.photos, patch.photo)
      : normalizeIngredientPhotos(existing?.photos, existing?.photo);
  const record = {
    ...(existing || {}),
    productCode,
    ingredientName: patch.ingredientName ?? existing?.ingredientName ?? '',
    category,
    tags,
    manufacturer: patch.manufacturer ?? existing?.manufacturer ?? '',
    discontinued: patch.discontinued ?? existing?.discontinued ?? false,
    baseQuantity:
      patch.baseQuantity != null ? Number(patch.baseQuantity) : (existing?.baseQuantity ?? null),
    baseUnitType: patch.baseUnitType ?? existing?.baseUnitType ?? 'g',
    taxType: patch.taxType ?? existing?.taxType ?? '과세',
    note: patch.note ?? existing?.note ?? '',
    photos,
    photo: getPrimaryIngredientPhoto({ photos }),
    // 수동 단가(부가세포함) 오버라이드 — 누락 시 기존값 보존. ''/null이면 해제
    priceOverride:
      patch.priceOverride != null && patch.priceOverride !== ''
        ? Number(patch.priceOverride)
        : patch.priceOverride === '' || patch.priceOverride === null
          ? null
          : (existing?.priceOverride ?? null),
    supplierId: patch.supplierId ?? existing?.supplierId ?? null,
    supplierName: patch.supplierName ?? existing?.supplierName ?? null,
    isManual: existing?.isManual ?? false,
    isSeeded: existing?.isSeeded ?? false,
    temperature:
      patch.temperature !== undefined
        ? (patch.temperature || '').trim() || null
        : (existing?.temperature ?? null),
    originHidden:
      patch.originHidden !== undefined
        ? patch.originHidden === true
        : (existing?.originHidden ?? false),
    // 전용/범용(scope) — patch가 명시하면 덮어씀, 없으면 기존값 보존
    scope: patch.scope !== undefined ? (patch.scope || '').trim() : (existing?.scope ?? ''),
    // 원산지·알레르기 — patch가 명시하면 덮어씀, 없으면 기존값 보존
    origin:
      patch.origin !== undefined
        ? normalizeOrigin(patch.origin)
        : normalizeOrigin(existing?.origin),
    allergens:
      patch.allergens !== undefined
        ? Array.isArray(patch.allergens)
          ? [...patch.allergens]
          : []
        : (existing?.allergens ?? []),
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
  const targets = findIngredientsByProductCode(all, productCode);
  const existing = [...targets].sort(compareIngredientKeep)[0] || {};
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    if (targets.length) {
      targets.forEach(row => st.put({ ...row, excluded: true, updatedAt: now }));
    } else {
      st.put({
        ...existing,
        productCode,
        excluded: true,
        isManual: false,
        updatedAt: now,
      });
    }
  });
}

export async function restoreIngredientByCode(productCode) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const targets = findIngredientsByProductCode(all, productCode);
  if (!targets.length) return;
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    targets.forEach(row => st.put({ ...row, excluded: false, updatedAt: now }));
  });
}

// ── 삭제 ─────────────────────────────────────────────────────

/**
 * 여러 식자재를 일괄 삭제. 삭제된 원본 레코드 배열을 반환(실행취소용).
 * @param {Array<number>} ids
 * @returns {Promise<object[]>} 삭제된 cost_ingredients 원본 레코드 목록
 */
export async function bulkDeleteIngredients(ids) {
  const removed = [];
  for (const id of ids) {
    const rec = await deleteIngredient(id).catch(() => null);
    if (rec) removed.push(rec);
  }
  return removed;
}

/**
 * 식자재 단건 삭제. 삭제된 원본 레코드를 반환(실행취소용).
 * @param {number} id
 * @returns {Promise<object|null>} 삭제된 cost_ingredients 원본 레코드 (없으면 null)
 */
export async function deleteIngredient(id) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const target = all.find(r => r.id === id);
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).delete(id);
  });
  if (target?.productCode) {
    // 영양값 cascade — nutrition 모듈을 지연 로드해 ingredient↔nutrition eager 결합 방지
    await import('@/lib/nutrition/values/store')
      .then(m => m.deleteIngredientValueByCode(target.productCode))
      .catch(() => {});
  }
  if (target) {
    // 알레르기 링크 cascade — 실제 연결 기준은 메뉴가 아니라 식자재다.
    await import('@/lib/nutrition/allergen/store')
      .then(m =>
        m.deleteAllergenLinksByIngredient({
          ingredientId: target.id,
          productCode: target.productCode,
        })
      )
      .catch(() => {});
  }
  logWork('DELETE', `식자재 삭제: ${target?.ingredientName || target?.productName || ''}`, {
    ref: id,
  }).catch(e => console.warn('[ingredient/store] logWork 실패', e));
  return target ?? null;
}

/** 분류(category) 전역 삭제 — 해당 분류를 가진 모든 식자재의 category를 비움 */
export async function removeCategoryFromAll(category) {
  if (!hasStore('cost_ingredients') || !category) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => r.category === category);
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, category: '', updatedAt: now });
  });
  return { updated: targets.length };
}

/** 태그(tag) 전역 삭제 — 모든 식자재의 tags 배열에서 해당 태그 제거 */
export async function removeTagFromAll(tag) {
  if (!hasStore('cost_ingredients') || !tag) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => Array.isArray(r.tags) && r.tags.includes(tag));
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, tags: r.tags.filter(t => t !== tag), updatedAt: now });
  });
  return { updated: targets.length };
}

/** 전체 cost_ingredients 초기화 — 식자재 마스터/메타 모두 삭제 */
export async function resetAllIngredients() {
  if (!hasStore('cost_ingredients')) return { deleted: 0 };
  const all = await getAll('cost_ingredients');
  const count = all.length;
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    tx.objectStore('cost_ingredients').clear();
  });
  logWork('RESET', `식자재 전체 초기화 (${count}건 삭제)`).catch(() => {});
  return { deleted: count };
}

export async function getIngredientProductCodeDuplicateDiagnostics() {
  if (!hasStore('cost_ingredients')) {
    return buildIngredientProductCodeDuplicateDiagnostics();
  }
  const [rows, nutritionValues] = await Promise.all([
    getAll('cost_ingredients'),
    hasStore('nutrition_ingredient_values') ? getAll('nutrition_ingredient_values') : [],
  ]);
  return buildIngredientProductCodeDuplicateDiagnostics(rows, nutritionValues);
}

export async function repairIngredientProductCodeDuplicates() {
  if (!hasStore('cost_ingredients')) {
    const empty = buildIngredientProductCodeDuplicateDiagnostics();
    return { before: empty, after: empty, removed: 0 };
  }
  const rows = await getAll('cost_ingredients');
  const nutritionValues = hasStore('nutrition_ingredient_values')
    ? await getAll('nutrition_ingredient_values')
    : [];
  const before = buildIngredientProductCodeDuplicateDiagnostics(rows, nutritionValues);
  if (!before.hasDuplicates) return { before, after: before, removed: 0 };

  const grouped = recordsByProductCode(rows);
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const group of before.groups) {
      const items = [...(grouped.get(group.key) || [])].sort(compareIngredientKeep);
      const keep = items[0];
      const remove = items.slice(1);
      if (!keep || !remove.length) continue;
      st.put(mergeDuplicateIngredientRecord(keep, remove, now));
      remove.forEach(row => {
        if (row.id != null) st.delete(row.id);
      });
    }
  });

  const compacted = [];
  const removeIds = new Set(before.groups.flatMap(group => group.removeIds));
  for (const group of before.groups) {
    const items = [...(grouped.get(group.key) || [])].sort(compareIngredientKeep);
    if (items[0]) compacted.push(mergeDuplicateIngredientRecord(items[0], items.slice(1), now));
  }
  for (const row of rows) {
    if (removeIds.has(row.id)) continue;
    if (before.groups.some(group => group.keepId === row.id)) continue;
    compacted.push(row);
  }
  const after = buildIngredientProductCodeDuplicateDiagnostics(compacted, nutritionValues);
  return { before, after, removed: before.duplicateRows };
}

// ── 벌크 임포트 (엑셀 마스터파일 가져오기) ───────────────────

/**
 * 엑셀에서 파싱된 품목 배열을 cost_ingredients에 upsert.
 * productCode 기준으로 기존 항목이 있으면 업데이트, 없으면 신규 삽입.
 * items 필드: productCode, productName, taxType, baseQuantity, baseUnitType,
 *             priceOverride, note, isManual, category, tags
 *
 * compositeOf (string[] | null): 이 식자재가 다른 제품코드의 조합으로
 * 구성될 때 참조하는 productCode 배열. 참조 코드의 실제 존재 여부는
 * best-effort로만 검증(console.warn)하며 저장을 막지 않는다.
 * UI 레이어에서 사전 경고가 필요하면 {@link validateCompositeRefs}를 사용.
 */
export async function bulkImportIngredients(items) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  if (!Array.isArray(items) || !items.length) return { inserted: 0, updated: 0, total: 0 };
  const all = await getAll('cost_ingredients');
  const byCode = new Map(
    [...recordsByProductCode(all).entries()].map(([key, rows]) => [
      key,
      [...rows].sort(compareIngredientKeep)[0],
    ])
  );
  // 벌크 임포트 시 compositeOf 참조를 기존 코드 + 임포트 코드 기준으로 베스트-에포트 검증.
  // 누락 참조가 있으면 console.warn만 출력하고 저장은 계속 진행한다.
  const importCodes = new Set(
    items.filter(it => it.productCode).map(it => String(it.productCode).trim().toLowerCase())
  );
  const existingCodes = new Set(
    all.filter(r => r.productCode).map(r => String(r.productCode).trim().toLowerCase())
  );
  const allKnownCodes = new Set([...existingCodes, ...importCodes]);
  for (const it of items) {
    if (!Array.isArray(it.compositeOf) || !it.compositeOf.length) continue;
    const missing = findMissingRefs(it.compositeOf, allKnownCodes);
    if (missing.length) {
      console.warn(
        `[ingredient/store] bulkImportIngredients: ${it.productCode} compositeOf 참조 코드 없음:`,
        missing
      );
    }
  }
  const now = new Date().toISOString();
  let inserted = 0,
    updated = 0;
  const recordsByCode = new Map();
  for (const it of items) {
    const codeKey = productCodeKey(it.productCode) || `__row_${recordsByCode.size}`;
    const existing = byCode.get(codeKey);
    const photos = normalizeIngredientPhotos(
      it.photos ?? existing?.photos,
      it.photo ?? existing?.photo
    );
    const record = {
      ...(existing || {}),
      productCode: it.productCode,
      ingredientName: existing?.ingredientName?.trim() || it.productName || '',
      category: it.category || existing?.category || '',
      tags: normalizeTags(it.tags ?? existing?.tags),
      manufacturer: it.manufacturer || existing?.manufacturer || '',
      discontinued: it.discontinued === true,
      taxType: it.taxType ?? existing?.taxType ?? '과세',
      baseQuantity:
        it.baseQuantity != null ? Number(it.baseQuantity) : (existing?.baseQuantity ?? null),
      baseUnitType: it.baseUnitType || existing?.baseUnitType || 'g',
      priceOverride:
        it.priceOverride != null ? Number(it.priceOverride) : (existing?.priceOverride ?? null),
      compositeOf: it.compositeOf ?? existing?.compositeOf ?? null,
      note: it.note ?? existing?.note ?? '',
      photos,
      photo: getPrimaryIngredientPhoto({ photos }),
      isManual: it.isManual === true,
      isSeeded: true,
      updatedAt: now,
    };
    delete record.categories;
    recordsByCode.set(codeKey, { record, existing: !!existing });
  }
  const records = [...recordsByCode.values()].map(({ record, existing }) => {
    if (existing) updated++;
    else inserted++;
    return record;
  });
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const s = store(tx);
    for (const r of records) s.put(r);
  });
  return { inserted, updated, total: records.length };
}

// ── 마스터 시드 ──────────────────────────────────────────────

export async function seedMasterIngredients(items) {
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  // 7번가(main) 전용 마스터 시드 — 다른 브랜드에 7번가 데이터 주입 방지
  if (getActiveBrandId() !== 'main')
    throw new Error('7번가피자 전용 시드입니다. 현재 브랜드에는 적용되지 않습니다.');
  if (!Array.isArray(items) || !items.length) return { inserted: 0, updated: 0, total: 0 };
  const all = await getAll('cost_ingredients');
  const byCode = new Map(
    [...recordsByProductCode(all).entries()].map(([key, rows]) => [
      key,
      [...rows].sort(compareIngredientKeep)[0],
    ])
  );
  const now = new Date().toISOString();
  let inserted = 0,
    updated = 0;
  const recordsByCode = new Map();
  for (const it of items) {
    const codeKey = productCodeKey(it.productCode) || `__row_${recordsByCode.size}`;
    const existing = byCode.get(codeKey);
    const photos = normalizeIngredientPhotos(existing?.photos, existing?.photo);
    const base = {
      ...(existing || {}),
      productCode: it.productCode,
      ingredientName: existing?.ingredientName?.trim() || it.productName,
      category: it.category || '',
      tags: normalizeTags(it.tags),
      manufacturer: it.manufacturer || existing?.manufacturer || '',
      discontinued: it.discontinued === true,
      taxType: existing?.taxType || '과세',
      baseQuantity: existing?.baseQuantity ?? null,
      baseUnitType: existing?.baseUnitType || 'g',
      note: existing?.note || '',
      photos,
      photo: getPrimaryIngredientPhoto({ photos }),
      isManual: false,
      isSeeded: true,
      updatedAt: now,
    };
    // legacy 'categories' 필드 정리 (분류/태그 분리 전 잔재)
    delete base.categories;
    recordsByCode.set(codeKey, { record: base, existing: !!existing });
  }
  const records = [...recordsByCode.values()].map(({ record, existing }) => {
    if (existing) updated++;
    else inserted++;
    return record;
  });
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const s = store(tx);
    for (const r of records) s.put(r);
  });
  return { inserted, updated, total: records.length };
}

// ── 내부 헬퍼 ────────────────────────────────────────────────

function normalizeTags(input) {
  if (Array.isArray(input)) return input.map(t => String(t).trim()).filter(Boolean);
  if (typeof input === 'string')
    return input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  return [];
}

/** legacy categories[]에서 category(첫 번째) 추출 */
function readCategory(rec) {
  if (!rec) return '';
  if (Array.isArray(rec.categories) && rec.categories[0]) return rec.categories[0];
  return rec.category || '';
}

/** legacy categories[]에서 tags(2번째 이후) 추출 */
function readTags(rec) {
  if (!rec) return [];
  if (Array.isArray(rec.categories) && rec.categories.length > 1) return rec.categories.slice(1);
  return rec.tags || [];
}

function buildRecord(data) {
  const category = (data.category || '').trim();
  const tags = normalizeTags(data.tags);
  const photos = normalizeIngredientPhotos(data.photos, data.photo);
  const baseQuantity =
    data.baseQuantity != null && data.baseQuantity !== '' ? Number(data.baseQuantity) : null;
  const priceOverride =
    data.priceOverride != null && data.priceOverride !== '' ? Number(data.priceOverride) : null;
  if (baseQuantity != null && baseQuantity < 0)
    throw new Error('포장단위 수량은 0 이상이어야 합니다');
  if (priceOverride != null && priceOverride < 0)
    throw new Error('수동 단가는 0 이상이어야 합니다');
  return {
    ingredientName: (data.ingredientName || '').trim(),
    productCode: (data.productCode || '').trim() || null,
    category,
    tags,
    manufacturer: (data.manufacturer || '').trim(),
    discontinued: data.discontinued === true,
    baseQuantity,
    baseUnitType: data.baseUnitType || 'g',
    taxType: data.taxType || '과세',
    priceOverride,
    scope: (data.scope || '').trim(), // 코드없는 항목의 사용자 지정 전용/범용
    note: (data.note || '').trim(),
    photos,
    photo: getPrimaryIngredientPhoto({ photos }),
    isManual: data.isManual ?? true,
    isSeeded: data.isSeeded === true,
    temperature: (data.temperature || '').trim() || null,
    originHidden: data.originHidden === true, // 원산지 표시 대상 아님(미표시대상)
    // 원산지 (배열 정규화 — 구버전 객체도 자동 변환)
    origin: normalizeOrigin(data.origin), // [{displayName, country}] | null
    allergens: Array.isArray(data.allergens) ? [...data.allergens] : [], // ['AL01','AL06',…]
    updatedAt: new Date().toISOString(),
  };
}
