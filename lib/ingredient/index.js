/** 분류명 → CSS variable 기반 칩 색상 (8색 순환, 다크모드 자동 대응) */
export function getCategoryStyle(category) {
  if (!category) return {};
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) % 8;
  const n = h + 1;
  return { background: `var(--cat-${n}-bg)`, color: `var(--cat-${n}-text)` };
}

/** 메인 카테고리 우선순위 — 분류 칩 정렬용 */
const MAIN_CATEGORY_PRIORITY = [
  '엣지', '도우/밀가루',
  '토핑재료', '토핑재류',
  '사이드', '소스류',
  '스파게티', '떡볶이',
  '시즈닝', '스톡', '피클재료',
];

/** 분류 정렬 — 메인 카테고리 우선순위 + 가나다순 */
export function sortMainCategories(cats) {
  if (!Array.isArray(cats) || cats.length <= 1) return cats || [];
  const rank = (t) => {
    const i = MAIN_CATEGORY_PRIORITY.indexOf(t);
    return i === -1 ? 999 : i;
  };
  return [...cats].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, 'ko');
  });
}

/** 해시태그 정렬 — 가나다순 */
export function sortHashTags(tags) {
  if (!Array.isArray(tags) || tags.length <= 1) return tags || [];
  return [...tags].sort((a, b) => a.localeCompare(b, 'ko'));
}

/** (deprecated alias) — 기존 코드 호환용 */
export const sortCategoryTags = sortMainCategories;

/** price_rows.productStatus → scope 도출 (전용/범용/범용관리) */
function deriveScope(p, hasRecord) {
  const status = (p?.productStatus || '').replace(/\s/g, '');
  if (status.includes('범용관리')) return '범용관리';
  if (status.includes('전용'))     return '전용';
  if (status.includes('범용'))     return '범용';
  // 가격파일에 상태 없음 → 마스터 등록 여부로 fallback
  return hasRecord ? '전용' : '범용';
}

export {
  getAllIngredients,
  getIngredientMetaMap,
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  deleteIngredient,
  excludeIngredientByCode,
  restoreIngredientByCode,
  seedMasterIngredients,
} from './store';

export { INGREDIENT_MASTER_SEED, SEED_MAIN_CATEGORIES, SEED_HASH_TAGS } from './master-seed';

import { simplifyIngredientName } from '@/lib/normalize';

/**
 * price_rows + cost_ingredients 메타를 합쳐 화면용 행 반환
 * category/tags 분리 모델 사용. legacy categories[]는 자동 마이그레이션.
 */
export function mergeIngredientRows(priceRows, metaMap) {
  return priceRows.map(p => {
    const meta      = metaMap.get(p.productCode) || {};
    const hasRecord = metaMap.has(p.productCode);
    // legacy 마이그레이션: categories[]가 있으면 첫번째 → category, 나머지 → tags
    const category = meta.category
      || (Array.isArray(meta.categories) && meta.categories[0]) || '';
    const tags = (Array.isArray(meta.tags) && meta.tags.length)
      ? meta.tags
      : (Array.isArray(meta.categories) ? meta.categories.slice(1) : []);
    const baseQty   = meta.baseQuantity ?? null;
    const unitType  = meta.baseUnitType  ?? p.salesUnit ?? 'g';
    const unitPrice = baseQty && baseQty > 0 && p.priceWithTax
      ? Math.round(p.priceWithTax / baseQty * 100) / 100
      : null;
    return {
      productCode:    p.productCode,
      productName:    p.productName,
      displayName:    simplifyIngredientName(p.productName),
      ingredientName: meta.ingredientName || '',
      temperature:    p.temperature,
      salesUnit:      p.salesUnit,
      taxType:        p.taxType,
      price:          p.price,
      priceWithTax:   p.priceWithTax,
      productStatus:  p.productStatus,
      scope:          deriveScope(p, hasRecord),
      category,
      tags,
      manufacturer:   meta.manufacturer || '',
      discontinued:   meta.discontinued === true,
      baseQuantity:   baseQty,
      baseUnitType:   unitType,
      note:           meta.note         || '',
      unitPrice,
      jetteLinked:    true,
      excluded:       meta.excluded === true,
      hasRecord,
      isSeeded:       meta.isSeeded === true,
      updatedAt:      meta.updatedAt || null,
    };
  });
}
