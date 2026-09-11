/**
 * lib/menu-master/topping-recipe-prefill.js — 영양 토핑마스터의 식자재 연결을
 * menu_recipes의 topping kind 구성품으로 옮기는 계획(순수 함수, DB 접근 없음).
 *
 * nutrition_topping_master(toppingCode)와 menu_master 추가토핑(T-ETC-NNN)은 서로
 * 다른 코드 체계라 buildToppingImportPlan(멱등 등록)과 같은 규칙 — toppingDisplayName
 * 으로 정규화한 "이름"으로만 이어진다. 이미 구성품이 채워진 레시피는 사용자가 직접
 * 입력한 값일 수 있으므로 overwriteExisting을 명시하지 않는 한 절대 덮어쓰지 않는다.
 * 수량은 토핑마스터에 없는 값이라 채우지 않는다 — 화면에서 사용자가 입력한다.
 */
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { MENU_CATEGORY } from '@/lib/menu-categories';
import { isExtraToppingCategory } from '@/lib/menu-master/category-policy';
import { toppingDisplayName } from './topping-import';

/**
 * @param {Array} toppings - getAllToppings() 결과 (nutrition_topping_master)
 * @param {Array} menuMasterRows - getAllMenuMaster() 결과
 * @param {Map} toppingRecipeMap - loadMenuRecipeMaps().topping (menuCode → recipe)
 * @param {Map} unitPriceMap - buildUnitPriceMap() 결과 (productCode → {baseUnitType,...})
 * @param {{overwriteExisting?: boolean}} [options]
 * @returns {Array<{menuCode, menuName, category, kind, size, components, selectedRecipeGroupIds}>}
 */
export function buildToppingRecipePrefillPlan(
  toppings,
  menuMasterRows,
  toppingRecipeMap,
  unitPriceMap = new Map(),
  options = {}
) {
  const overwriteExisting = options?.overwriteExisting === true;
  const recipeMap = toppingRecipeMap instanceof Map ? toppingRecipeMap : new Map();
  const priceMap = unitPriceMap instanceof Map ? unitPriceMap : new Map();

  const toppingByName = new Map();
  for (const topping of Array.isArray(toppings) ? toppings : []) {
    const name = toppingDisplayName(topping);
    const productCode = String(topping?.productCode || '').trim();
    if (!name || !productCode || toppingByName.has(name)) continue;
    toppingByName.set(name, { ...topping, productCode });
  }

  const plans = [];
  for (const menu of Array.isArray(menuMasterRows) ? menuMasterRows : []) {
    if (!isExtraToppingCategory(menu?.category) || !menu?.menuCode) continue;

    const topping = toppingByName.get(String(menu?.menuName || '').trim());
    if (!topping) continue;

    const existingComponents = recipeMap.get(menu.menuCode)?.components;
    const hasComponents = Array.isArray(existingComponents) && existingComponents.length > 0;
    if (hasComponents && !overwriteExisting) continue;

    const priceInfo = priceMap.get(topping.productCode);
    plans.push({
      menuCode: menu.menuCode,
      menuName: menu.menuName,
      category: MENU_CATEGORY.EXTRA_TOPPING,
      kind: 'topping',
      size: '단일',
      components: [
        {
          productCode: topping.productCode,
          ingredientName: String(topping.ingredientName || '').trim(),
          quantity: null,
          unit: normalizeCostBaseUnit(priceInfo?.baseUnitType),
        },
      ],
      selectedRecipeGroupIds: [],
    });
  }
  return plans;
}
