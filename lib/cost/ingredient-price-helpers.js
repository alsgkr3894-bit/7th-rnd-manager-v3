/**
 * lib/cost/ingredient-price-helpers.js — 식자재 단가 페이지 데이터 빌드 헬퍼
 *
 * UI에 의존하지 않는 순수 계산 함수만 포함.
 * 테스트 가능하도록 사이드이펙트(setState, toast) 없음.
 */

import { resolveCompositePrice } from './composite-price';

const USAGE_TOP_CATEGORIES = new Set(['피자', '1인피자', '사이드']);

function normalizeIngName(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '');
}

function stripSizeLabel(name) {
  return (name || '').replace(/\s+[LR]$/i, '').trim();
}

/**
 * 4개 레시피 스토어에서 식자재별 사용 메뉴 맵을 빌드한다.
 *
 * @param {object} params
 * @param {Array}  params.allMeta       - 전체 식자재 마스터
 * @param {Array}  params.pizzaRecs     - 피자 세부 레시피
 * @param {Array}  params.personalRecs  - 1인피자 세부 레시피
 * @param {Array}  params.sideRecs      - 사이드 세부 레시피
 * @param {Array}  params.oldRecs       - 구 레시피 (menuCategory 필드 포함)
 * @returns {{ byCode: Map, byName: Map }}
 *   byCode: productCode → Map<menuName, topCategory>
 *   byName: normalizedIngName → Map<menuName, topCategory>
 */
/**
 * compositeOf 코드 배열에서 제때 단가를 합산해 반환한다.
 *
 * 일부 코드에 단가가 없어도 존재하는 단가를 모두 합산한다 (partial-sum 허용).
 * 합산 결과가 0이면 null을 반환한다.
 *
 * @param {string[]} compositeOf  - 구성 상품코드 배열
 * @param {Map<string, { priceWithTax: number }>} priceLookup
 *   - productCode → 가격행 (priceWithTax 필드 사용)
 * @returns {number|null}  합산 단가, 또는 합산 결과가 0이면 null
 */
export function sumCompositePrice(compositeOf, priceLookup) {
  return resolveCompositePrice(compositeOf, priceLookup, { mode: 'partial' }).priceWithTax;
}

export function buildIngredientUsageMap({ allMeta, pizzaRecs, personalRecs, sideRecs, oldRecs }) {
  const byCode = new Map();
  const byName = new Map();

  // 재료명 → productCode 역방향 인덱스 (productCode 없는 컴포넌트의 코드 복원용)
  const nameToCode = new Map();
  for (const m of allMeta) {
    if (!m.productCode) continue;
    const norm = normalizeIngName(m.ingredientName);
    if (norm && !nameToCode.has(norm)) nameToCode.set(norm, m.productCode);
  }

  function addUsage(productCode, ingredientName, menuName, topCategory) {
    if (!menuName) return;
    const menu = stripSizeLabel(menuName);
    const norm = normalizeIngName(ingredientName);
    const code = productCode || nameToCode.get(norm) || null;

    if (code) {
      if (!byCode.has(code)) byCode.set(code, new Map());
      byCode.get(code).set(menu, topCategory);
    }
    if (norm) {
      if (!byName.has(norm)) byName.set(norm, new Map());
      byName.get(norm).set(menu, topCategory);
    }
  }

  for (const r of pizzaRecs)
    for (const c of r.components || [])
      addUsage(c.productCode, c.ingredientName, r.menuName, '피자');
  for (const r of personalRecs)
    for (const c of r.components || [])
      addUsage(c.productCode, c.ingredientName, r.menuName, '1인피자');
  for (const r of sideRecs)
    for (const c of r.components || [])
      addUsage(c.productCode, c.ingredientName, r.menuName, '사이드');

  for (const r of oldRecs) {
    const topCategory = (r.menuCategory || '').split('/')[0];
    if (!USAGE_TOP_CATEGORIES.has(topCategory)) continue;
    for (const ing of r.ingredients || [])
      addUsage(ing.productCode, ing.ingredientName, r.menuName, topCategory);
  }

  return { byCode, byName };
}
