/** origin 값을 [{displayName,country}] 배열로 정규화 (구버전 객체·null 모두 처리) */
function normalizeOriginArr(v) {
  if (!v) return null;
  if (Array.isArray(v)) {
    const items = v.filter(it => it.country?.trim());
    return items.length ? items : null;
  }
  return v.country?.trim() ? [{ displayName: v.displayName || '', country: v.country }] : null;
}

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
  '엣지',
  '도우/밀가루',
  '토핑재료',
  '치즈류',
  '사이드',
  '소스류',
  '스파게티',
  '떡볶이',
  '시즈닝',
  '스톡',
  '피클재료',
];

/** 분류 정렬 — 메인 카테고리 우선순위 + 가나다순 */
export function sortMainCategories(cats) {
  if (!Array.isArray(cats) || cats.length <= 1) return cats || [];
  const rank = t => {
    const i = MAIN_CATEGORY_PRIORITY.indexOf(t);
    return i === -1 ? 999 : i;
  };
  return [...cats].sort((a, b) => {
    const ra = rank(a),
      rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, 'ko');
  });
}

/** 해시태그 정렬 — 가나다순 */
export function sortHashTags(tags) {
  if (!Array.isArray(tags) || tags.length <= 1) return tags || [];
  return [...tags].sort((a, b) => a.localeCompare(b, 'ko'));
}

/** price_rows.productStatus → scope 도출 */
export function deriveScope(p, hasRecord) {
  const status = (p?.productStatus || '').replace(/\s/g, '');
  if (status.includes(SCOPE.GENERIC_MANAGED)) return SCOPE.GENERIC_MANAGED;
  if (status.includes(SCOPE.EXCLUSIVE)) return SCOPE.EXCLUSIVE;
  if (status.includes(SCOPE.GENERIC)) return SCOPE.GENERIC;
  return hasRecord ? SCOPE.EXCLUSIVE : SCOPE.GENERIC;
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
  bulkImportIngredients,
  resetAllIngredients,
  removeCategoryFromAll,
  removeTagFromAll,
} from './store';

export { INGREDIENT_MASTER_SEED, SEED_MAIN_CATEGORIES, SEED_HASH_TAGS } from './master-seed';

import { simplifyIngredientName } from '@/lib/normalize';
import { SCOPE, SCOPE_UNASSIGNED } from './constants';
import { TYPE_LABEL } from '@/components/jette/managed-products-constants';

/**
 * price_rows + cost_ingredients 메타를 합쳐 화면용 행 반환
 *
 * @param {object[]} priceRows
 * @param {Map} metaMap  productCode → cost_ingredients 레코드
 * @param {Map} [typeMap] productCode → ref_shipment_products.productType
 *   ('exclusive'|'generic'|'generic-managed'). 제때 연동 항목의 전용/범용 단일 출처.
 */
export function mergeIngredientRows(priceRows, metaMap, typeMap = null) {
  return priceRows.map(p => {
    const meta = metaMap.get(p.productCode) || {};
    const hasRecord = metaMap.has(p.productCode);
    const category = meta.category || (Array.isArray(meta.categories) && meta.categories[0]) || '';
    const tags =
      Array.isArray(meta.tags) && meta.tags.length
        ? meta.tags
        : Array.isArray(meta.categories)
          ? meta.categories.slice(1)
          : [];
    const baseQty = meta.baseQuantity ?? null;
    const unitType = meta.baseUnitType ?? p.salesUnit ?? 'g';
    const unitPrice =
      baseQty && baseQty > 0 && p.priceWithTax != null
        ? Math.round((p.priceWithTax / baseQty) * 100) / 100
        : null;
    return {
      id: meta.id ?? null,
      productCode: p.productCode,
      productName: p.productName,
      displayName: simplifyIngredientName(p.productName),
      ingredientName: meta.ingredientName || '',
      temperature: p.temperature,
      salesUnit: p.salesUnit,
      taxType: p.taxType,
      price: p.price,
      priceWithTax: p.priceWithTax,
      priceOverride: meta.priceOverride ?? null,
      productStatus: p.productStatus,
      // 전용/범용 단일 출처 = 제때 관리품목(productType). 없으면 미지정.
      scope: (typeMap && TYPE_LABEL[typeMap.get(p.productCode)]) || SCOPE_UNASSIGNED,
      category,
      tags,
      manufacturer: meta.manufacturer || '',
      discontinued: meta.discontinued === true,
      baseQuantity: baseQty,
      baseUnitType: unitType,
      note: meta.note || '',
      unitPrice,
      jetteLinked: true,
      excluded: meta.excluded === true,
      hasRecord,
      isSeeded: meta.isSeeded === true,
      updatedAt: meta.updatedAt || null,
      origin: normalizeOriginArr(meta.origin),
      allergens: Array.isArray(meta.allergens) ? meta.allergens : [],
      originHidden: meta.originHidden === true,
    };
  });
}

/**
 * 가격파일에 없는 메타(시드/수동) 행을 mergedRow 형태로 변환.
 * list·manage 페이지 공통 사용.
 */
export function buildMetaOnlyRow(m) {
  const baseQty = m.baseQuantity ?? null;
  const unitType = m.baseUnitType || 'g';
  const unitPrice =
    baseQty && baseQty > 0 && m.priceOverride != null
      ? Math.round((m.priceOverride / baseQty) * 100) / 100
      : null;
  const category = m.category || (Array.isArray(m.categories) && m.categories[0]) || '';
  const tags =
    Array.isArray(m.tags) && m.tags.length
      ? m.tags
      : Array.isArray(m.categories)
        ? m.categories.slice(1)
        : [];
  return {
    id: m.id,
    productCode: m.productCode || null,
    productName: m.ingredientName,
    displayName: m.ingredientName,
    ingredientName: m.ingredientName,
    temperature: m.temperature || null,
    salesUnit: null,
    taxType: m.taxType || '과세',
    price: m.priceOverride,
    priceWithTax: m.priceOverride,
    priceOverride: m.priceOverride ?? null,
    productStatus: null,
    scope: m.scope || SCOPE_UNASSIGNED, // 코드없는 항목: 지정값 또는 미지정
    category,
    tags,
    manufacturer: m.manufacturer || '',
    discontinued: m.discontinued === true,
    baseQuantity: baseQty,
    baseUnitType: unitType,
    note: m.note || '',
    unitPrice,
    jetteLinked: false,
    excluded: m.excluded === true,
    hasRecord: true,
    isManual: m.isManual === true,
    isSeeded: m.isSeeded === true,
    updatedAt: m.updatedAt || null,
    origin: normalizeOriginArr(m.origin),
    allergens: Array.isArray(m.allergens) ? m.allergens : [],
    originHidden: m.originHidden === true,
  };
}

/**
 * 식자재 이슈 추출 — 미분류 / 포장수량없음 / 단가미연동 / 단가변동
 *
 * @param {object[]} rows  - mergeIngredientRows + buildMetaOnlyRow로 만든 행
 * @param {Map<string, {priceWithTax:number}>} [prevPriceMap] - 이전 가격파일 productCode → priceWithTax (선택)
 * @returns {object[]} 이슈가 있는 행에 issues:string[]와 priceDiff 정보가 추가됨
 */
export function computeIngredientIssues(rows, prevPriceMap) {
  const list = [];
  for (const r of rows) {
    if (r.discontinued || r.excluded) continue;
    const issues = [];
    let priceDiff = null;
    if (!r.category) issues.push('uncategorized');
    if (!r.baseQuantity) issues.push('no-unit');
    if (r.hasRecord && !r.jetteLinked) issues.push('no-price-link');
    // 코드없는(비연동) 항목인데 전용/범용이 미지정
    if (!r.jetteLinked && (!r.scope || r.scope === SCOPE_UNASSIGNED)) issues.push('no-scope');
    if (prevPriceMap && r.productCode && r.priceWithTax != null) {
      const prev = prevPriceMap.get(r.productCode);
      if (prev != null && prev !== r.priceWithTax) {
        const diff = r.priceWithTax - prev;
        const pct = (diff / prev) * 100;
        issues.push(diff > 0 ? 'price-up' : 'price-down');
        priceDiff = { oldPrice: prev, newPrice: r.priceWithTax, diff, pct };
      }
    }
    if (issues.length) list.push({ ...r, issues, priceDiff });
  }
  return list;
}
