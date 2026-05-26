/** 분류명 → CSS variable 기반 칩 색상 (8색 순환, 다크모드 자동 대응) */
export function getCategoryStyle(category) {
  if (!category) return {};
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) % 8;
  const n = h + 1;
  return { background: `var(--cat-${n}-bg)`, color: `var(--cat-${n}-text)` };
}

/** 메인 카테고리 우선순위 — 태그 정렬용 (대분류 먼저, 소분류 뒤) */
const MAIN_CATEGORY_PRIORITY = [
  '엣지', '도우/밀가루',
  '토핑재료', '토핑재류',
  '사이드', '소스류',
  '스파게티', '떡볶이',
  '시즈닝', '스톡', '피클재료',
];

/**
 * 태그 배열을 보기 좋게 정렬 — 메인 카테고리(대분류) 먼저, 그 외는 한글 가나다순
 * 예: ['수산류', '토핑재료'] → ['토핑재료', '수산류']
 */
export function sortCategoryTags(tags) {
  if (!Array.isArray(tags) || tags.length <= 1) return tags || [];
  const rank = (t) => {
    const i = MAIN_CATEGORY_PRIORITY.indexOf(t);
    return i === -1 ? 999 : i;
  };
  return [...tags].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, 'ko');
  });
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

export { INGREDIENT_MASTER_SEED } from './master-seed';

import { simplifyIngredientName } from '@/lib/normalize';

/**
 * price_rows + cost_ingredients 메타를 합쳐 화면용 행 반환 (리스트 페이지용)
 * displayName: 무게/온도/원산지 등을 제거한 단순 표시명
 */
export function mergeIngredientRows(priceRows, metaMap) {
  return priceRows.map(p => {
    const meta      = metaMap.get(p.productCode) || {};
    const hasRecord = metaMap.has(p.productCode);
    const categories = Array.isArray(meta.categories) && meta.categories.length
      ? meta.categories
      : (meta.category ? [meta.category] : []);
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
      categories,
      category:       categories[0] || '',
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
