/**
 * lib/ingredient/crud.js — 식자재 조회 / 추가 / 수정 CRUD
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { logWork } from '@/lib/work-log';
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';
import {
  recordsByProductCode,
  compareIngredientKeep,
  findIngredientByProductCode,
  assertUniqueProductCode,
} from './product-code';
import { findMissingRefs, validateCompositeRefs } from './composite-refs';
import { normalizeOrigin, normalizeTags, readCategory, readTags, buildRecord } from './normalize';
import { assertActiveAdmin } from '@/lib/auth/guard';

function store(tx) {
  return tx.objectStore('cost_ingredients');
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

export async function addIngredient(data) {
  await assertActiveAdmin('식자재 추가');
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
          console.warn('[ingredient/crud] addIngredient: compositeOf 참조 코드 없음:', missing);
      })
      .catch(e => console.warn('[ingredient/crud] validateCompositeRefs 실패', e));
  }
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).add(record);
  });
  logWork('INGREDIENT_SAVE', data.ingredientName || '식자재 등록').catch(e =>
    console.warn('[ingredient/crud] logWork 실패', e)
  );
}

export async function updateIngredient(id, data) {
  await assertActiveAdmin('식자재 수정');
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
          console.warn('[ingredient/crud] updateIngredient: compositeOf 참조 코드 없음:', missing);
      })
      .catch(e => console.warn('[ingredient/crud] validateCompositeRefs 실패', e));
  }
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put({ ...existing, ...nextRecord, id });
  });
  logWork('INGREDIENT_SAVE', data.ingredientName || existing.ingredientName || '식자재 수정', {
    ref: id,
  }).catch(e => console.warn('[ingredient/crud] logWork 실패', e));
}

/**
 * 제때 미연동 + 수동 단가입력 항목을 "단가 미연동 확인" 처리(또는 해제)한다.
 * buildRecord의 고정 필드 화이트리스트를 거치지 않고 해당 항목만 직접 patch한다.
 */
export async function setIngredientPriceManualConfirmed(id, confirmed) {
  await assertActiveAdmin('단가 미연동 확인');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('항목을 찾을 수 없습니다');
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).put({ ...existing, priceManualConfirmed: confirmed === true, updatedAt: now });
  });
  logWork(
    'INGREDIENT_SAVE',
    `${existing.ingredientName || '식자재'} 단가 미연동 ${confirmed ? '확인' : '확인 해제'}`,
    { ref: id }
  ).catch(e => console.warn('[ingredient/crud] logWork 실패', e));
}

export async function upsertIngredientMeta({ productCode, ...patch }) {
  await assertActiveAdmin('식자재 메타 저장');
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
      patch.baseQuantity != null
        ? Number.isFinite(Number(patch.baseQuantity))
          ? Number(patch.baseQuantity)
          : null
        : (existing?.baseQuantity ?? null),
    baseUnitType: patch.baseUnitType ?? existing?.baseUnitType ?? 'g',
    taxType: patch.taxType ?? existing?.taxType ?? '과세',
    note: patch.note ?? existing?.note ?? '',
    photos,
    photo: getPrimaryIngredientPhoto({ photos }),
    priceOverride:
      patch.priceOverride != null && patch.priceOverride !== ''
        ? Number.isFinite(Number(patch.priceOverride))
          ? Number(patch.priceOverride)
          : null
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
    originNone:
      patch.originNone !== undefined ? patch.originNone === true : (existing?.originNone ?? false),
    scope: patch.scope !== undefined ? (patch.scope || '').trim() : (existing?.scope ?? ''),
    origin:
      patch.origin !== undefined
        ? normalizeOrigin(patch.origin)
        : normalizeOrigin(existing?.origin),
    allergenNone:
      patch.allergenNone !== undefined
        ? patch.allergenNone === true
        : (existing?.allergenNone ?? false),
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
