/**
 * lib/ingredient/normalize.js — 식자재 레코드 정규화 순수 함수
 *
 * 외부 DB 호출 없음. store.js·crud.js·import.js 등에서 공유 사용.
 */
import { getPrimaryIngredientPhoto, normalizeIngredientPhotos } from './photos';

/**
 * origin 값을 [{displayName, country}] 배열로 정규화.
 * - 구버전 { displayName, country, region } → 배열로 승격
 * - 이미 배열이면 유효 항목만 유지
 * - null/undefined → null
 */
export function normalizeOrigin(v) {
  if (!v) return null;
  if (Array.isArray(v)) {
    const items = v
      .filter(it => it.country?.trim())
      .map(it => ({ displayName: (it.displayName || '').trim(), country: it.country.trim() }));
    return items.length ? items : null;
  }
  if (v.country?.trim()) {
    return [{ displayName: (v.displayName || '').trim(), country: v.country.trim() }];
  }
  return null;
}

export function normalizeTags(input) {
  if (Array.isArray(input)) return input.map(t => String(t).trim()).filter(Boolean);
  if (typeof input === 'string')
    return input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  return [];
}

/** legacy categories[]에서 category(첫 번째) 추출 */
export function readCategory(rec) {
  if (!rec) return '';
  if (Array.isArray(rec.categories) && rec.categories[0]) return rec.categories[0];
  return rec.category || '';
}

/** legacy categories[]에서 tags(2번째 이후) 추출 */
export function readTags(rec) {
  if (!rec) return [];
  if (Array.isArray(rec.categories) && rec.categories.length > 1) return rec.categories.slice(1);
  return rec.tags || [];
}

export function buildRecord(data) {
  const category = (data.category || '').trim();
  const tags = normalizeTags(data.tags);
  const photos = normalizeIngredientPhotos(data.photos, data.photo);
  const _bq = Number(data.baseQuantity);
  const baseQuantity =
    data.baseQuantity != null && data.baseQuantity !== '' && Number.isFinite(_bq) ? _bq : null;
  const _po = Number(data.priceOverride);
  const priceOverride =
    data.priceOverride != null && data.priceOverride !== '' && Number.isFinite(_po) ? _po : null;
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
    scope: (data.scope || '').trim(),
    note: (data.note || '').trim(),
    photos,
    photo: getPrimaryIngredientPhoto({ photos }),
    isManual: data.isManual ?? true,
    isSeeded: data.isSeeded === true,
    temperature: (data.temperature || '').trim() || null,
    originHidden: data.originHidden === true,
    originNone: data.originNone === true,
    origin: normalizeOrigin(data.origin),
    allergenNone: data.allergenNone === true,
    allergens: Array.isArray(data.allergens) ? [...data.allergens] : [],
    updatedAt: new Date().toISOString(),
  };
}
