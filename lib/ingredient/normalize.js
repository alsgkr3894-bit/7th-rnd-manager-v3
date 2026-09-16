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
  const baseUnitType = data.baseUnitType || 'g';
  const _pwg = Number(data.pieceWeightGrams);
  // 포장단위가 '개'일 때만 의미가 있다 — 'g' 단위로 바뀌면 이전에 입력했던 1개당 g은 버린다.
  const pieceWeightGrams =
    baseUnitType === '개' &&
    data.pieceWeightGrams != null &&
    data.pieceWeightGrams !== '' &&
    Number.isFinite(_pwg)
      ? _pwg
      : null;
  if (baseQuantity != null && baseQuantity < 0)
    throw new Error('포장단위 수량은 0 이상이어야 합니다');
  if (priceOverride != null && priceOverride < 0)
    throw new Error('수동 단가는 0 이상이어야 합니다');
  if (pieceWeightGrams != null && pieceWeightGrams < 0)
    throw new Error('1개당 g은 0 이상이어야 합니다');
  return {
    ingredientName: (data.ingredientName || '').trim(),
    // 조회/중복 검사(product-code.js productCodeKey)는 항상 대소문자 무관으로 비교하지만,
    // 저장값 자체는 원래 대소문자 그대로 남아 있었다 — 수동으로 소문자 코드를 입력하면
    // 제때 가격파일의 대문자 코드와 저장값이 달라 원산지/알레르기 라이브 조회(code: 접두 키)가
    // 매칭되지 않는 경우가 있었다. 제때 코드 표기(대문자)에 맞춰 저장 시 통일한다.
    productCode: (data.productCode || '').trim().toUpperCase() || null,
    category,
    tags,
    manufacturer: (data.manufacturer || '').trim(),
    discontinued: data.discontinued === true,
    baseQuantity,
    baseUnitType,
    pieceWeightGrams,
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
    // priceManualConfirmed는 의도적으로 이 화이트리스트에 넣지 않는다 — 폼(toForm)이 이 필드를
    // 알지 못하므로 넣으면 일반 저장마다 undefined→false로 리셋된다. setIngredientPriceManualConfirmed가
    // buildRecord를 거치지 않고 직접 patch하고, 여기 없으면 spread 시 기존 값이 그대로 보존된다.
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 코드도 이름도 없는 빈 껍데기 메타 레코드인지 — 실패한 저장이나 옛 흐름이 남긴 고스트 행.
 * 관리 목록에서 "-" 행으로 보이기만 하고 아무 액션도 할 수 없으므로 화면에서 숨긴다.
 * (삭제는 하지 않는다 — 원인 추적을 위해 데이터는 남겨 둔다.)
 */
export function isGhostIngredientMeta(meta) {
  if (!meta || typeof meta !== 'object') return true;
  const code = String(meta.productCode ?? '').trim();
  const name = String(meta.ingredientName ?? '').trim();
  return !code && !name;
}
