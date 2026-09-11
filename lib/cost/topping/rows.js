/**
 * lib/cost/topping/rows.js — /cost/topping(추가토핑 원가) 화면의 행 조립·저장 페이로드
 * 변환 순수 함수. DB 접근 없음 — 원가·원가율 계산은 원가보고서·마진표와 같은
 * effectiveComponentsCost/calcCostRate를 그대로 재사용해 숫자가 어긋나지 않게 한다.
 */
import { isExtraToppingCategory } from '@/lib/menu-master/category-policy';
import {
  componentEffectiveUnitPrice,
  effectiveComponentsCost,
} from '@/lib/cost/shared/effective-cost';
import { calcCostRate } from '@/lib/cost/rate-color';
import { MENU_CATEGORY, getMenuCodeRank } from '@/lib/menu-categories';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

/** menu_master 중 활성 상태의 추가토핑 카테고리 행만 추린다. */
export function filterToppingMenus(menus) {
  return asObjectArray(menus).filter(
    m => isExtraToppingCategory(m?.category) && m.status !== 'discontinued'
  );
}

/**
 * 추가토핑 메뉴 + 레시피(topping kind, 구성품 1개 원칙) + 단가맵을 조인해 화면 행을 만든다.
 * 구성품이 2개 이상인 레시피(메뉴마스터에서 직접 편집된 비정상 케이스)는 첫 구성품만
 * 표시·편집 대상으로 삼고 multiComponent:true로 표시해 덮어쓰기로 나머지가 소실되지
 * 않도록 경고한다.
 *
 * @param {{menus, recipeMap, unitPriceMap}} args
 * @returns {Array<{id, menuCode, menuName, price, component, multiComponent,
 *   unitPrice, cost, costRate, status}>}
 */
export function buildToppingCostRows({ menus, recipeMap, unitPriceMap = new Map() }) {
  const toppingMenus = filterToppingMenus(menus);
  const map = recipeMap instanceof Map ? recipeMap : new Map();

  const rows = toppingMenus.map(menu => {
    const recipe = map.get(menu.menuCode) || null;
    const components = asObjectArray(recipe?.components);
    const component = components[0] || null;
    const unitPrice = component ? componentEffectiveUnitPrice(component, unitPriceMap) : null;
    const cost = component ? effectiveComponentsCost([component], unitPriceMap) : 0;
    const price = asFiniteNumber(menu.price, null);
    const costRate = price != null ? calcCostRate(cost, price) : null;

    return {
      id: menu.id,
      menuCode: menu.menuCode,
      menuName: asDisplayText(menu.menuName),
      price,
      component,
      multiComponent: components.length > 1,
      unitPrice,
      cost,
      costRate,
      status: menu.status || 'active',
    };
  });

  return rows.sort(
    (a, b) =>
      getMenuCodeRank(a.menuCode) - getMenuCodeRank(b.menuCode) ||
      a.menuCode.localeCompare(b.menuCode, 'ko')
  );
}

/**
 * menu_master upsert(판매가 원본)에 넘길 페이로드.
 * size는 menu_master 관례상 단일 규격이면 null(lib/menu-master/store.js).
 */
export function buildToppingMenuPatch(row, changes = {}) {
  return {
    id: row.id ?? undefined,
    menuCode: row.menuCode,
    menuName: (changes.menuName ?? row.menuName ?? '').trim(),
    category: MENU_CATEGORY.EXTRA_TOPPING,
    size: null,
    status: row.status || 'active',
    price: changes.price !== undefined ? changes.price : row.price,
  };
}

/**
 * menu_recipes upsert(topping kind, 구성품 1개)에 넘길 페이로드.
 * size는 menu_recipes 관례상 '단일'(buildMenuRecipeRecord 기본값과 동일하게 명시).
 */
export function buildToppingRecipePatch(row, componentChanges = {}) {
  const base = row.component || {};
  const component = {
    productCode:
      componentChanges.productCode !== undefined ? componentChanges.productCode : base.productCode,
    ingredientName:
      componentChanges.ingredientName !== undefined
        ? componentChanges.ingredientName
        : base.ingredientName || '',
    quantity:
      componentChanges.quantity !== undefined ? componentChanges.quantity : (base.quantity ?? null),
    unit: componentChanges.unit !== undefined ? componentChanges.unit : base.unit || 'g',
  };
  return {
    menuCode: row.menuCode,
    menuName: row.menuName,
    category: MENU_CATEGORY.EXTRA_TOPPING,
    kind: 'topping',
    size: '단일',
    components: [component],
    selectedRecipeGroupIds: [],
  };
}
