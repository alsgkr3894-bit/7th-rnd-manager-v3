import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';
import { getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import {
  buildIngredientLookup,
  isInactiveIngredient,
  isIngredientOnOutputMenu,
  markShadowedNames,
  nameKeyVariants,
} from '@/lib/nutrition/allergen/ingredient-lookup';
import { applyOrder } from '@/lib/nutrition/order';
import { getMenuCodeRank } from '@/lib/menu-categories';

const EMPTY_MENU_MAP = new Map();
const EMPTY_SET = new Set();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);
const asSet = value => (value instanceof Set ? value : EMPTY_SET);

/**
 * 식자재 origin 배열 + 레시피 매핑 → 출력용 origins 배열로 변환.
 * 각 항목: { ingredientName, items:[{displayName,country}], menuCodes:[{menuCode,menuName}] }
 * overrides: 출력용 메뉴명 오버라이드 map
 */
export function buildOriginsFromIngredients(
  ingredients,
  ingredientToMenus,
  excludedMenuCodes = new Set(),
  excludedMenuNames = new Set(),
  overrides = {},
  masterByCode = {}
) {
  const ingredientMenuMap = asMenuMap(ingredientToMenus);
  const excludedCodes = asSet(excludedMenuCodes);
  const excludedNames = asSet(excludedMenuNames);
  const result = [];
  for (const ing of markShadowedNames(ingredients)) {
    const originItems = asObjectArray(ing.origin);
    if (!originItems.length || ing.originHidden) continue;
    const productCode = asDisplayText(ing.productCode);
    const ingredientName = asDisplayText(ing.ingredientName);
    const shadowed = new Set(ing.shadowedNameKeys);
    const lookupName = nameKeyVariants(ingredientName).some(key => shadowed.has(key))
      ? ''
      : ingredientName;
    // 레시피의 구형/수기 제품코드가 식자재 마스터와 대소문자가 달라도 이름과 코드
    // 변형을 모두 조회한다. 알레르기 집계와 같은 매칭 정책을 사용해야 두 출력이 같다.
    const merged = getMenusForIngredient(ingredientMenuMap, productCode, lookupName);

    const menuCodes = [...merged.entries()]
      .filter(([menuCode, meta]) => {
        const safeMenuCode = asDisplayText(menuCode);
        return (
          !excludedCodes.has(menuCode) &&
          !excludedCodes.has(safeMenuCode) &&
          !excludedNames.has(asDisplayText(meta?.menuName).trim())
        );
      })
      .map(([menuCode, meta]) => ({
        menuCode: asDisplayText(menuCode),
        menuName: applyMenuName(asDisplayText(menuCode), asDisplayText(meta?.menuName), overrides),
        category: asDisplayText(
          masterByCode?.[asDisplayText(menuCode)]?.category || meta?.category
        ),
      }));

    // 단종·제외 식자재는 출력 메뉴의 레시피에 남아 있을 때만 표시한다.
    if (isInactiveIngredient(ing) && !menuCodes.length) continue;

    result.push({
      ingredientName,
      // 식자재 분류('도우/밀가루' 등) — 도우를 피자공통으로 올리는 판정에 쓴다(output-sheets.js)
      category: asDisplayText(ing.category),
      items: originItems.map(it => ({
        displayName: asDisplayText(it.displayName) || ingredientName,
        country: asDisplayText(it.country),
      })),
      menuCodes,
    });
  }
  return result;
}

/**
 * 원산지가 있고 출력 대상인 식자재. 단종·제외 식자재는 출력 메뉴의 레시피에 남아 있을 때만 남긴다.
 * 미표시대상(originHidden)은 호출부가 거른다.
 */
export function filterOriginOutputIngredients(ingredients, ingredientToMenus, isExcludedMenu) {
  return markShadowedNames(ingredients).filter(
    ing =>
      asObjectArray(ing.origin).length &&
      (!isInactiveIngredient(ing) ||
        isIngredientOnOutputMenu(ing, ingredientToMenus, isExcludedMenu))
  );
}

/**
 * 식자재별 원산지 보기 행 목록을 계산합니다 (originIngredients 필터+정렬).
 * @param {object[]} originIngredients
 * @param {object} mapData - { ingredientToMenus: Map }
 * @param {function} isExcludedMenu - (menuCode, menuName) => boolean
 * @param {string} search
 * @returns {object[]}
 */
export function buildOriginIngredientRows(originIngredients, mapData, isExcludedMenu, search) {
  const q = asDisplayText(search).toLowerCase().trim();
  const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
  const filtered = originIngredients.filter(ing => {
    if (!q) return true;
    const productCode = asDisplayText(ing.productCode);
    const ingredientName = asDisplayText(ing.ingredientName);
    const menus = getMenusForIngredient(ingredientToMenus, productCode, ingredientName);
    const menuText = [...menus.entries()]
      .filter(([mc, m]) => !isExcludedMenu(mc, m?.menuName))
      .map(([, m]) => asDisplayText(m?.menuName))
      .join(' ');
    const originText = asObjectArray(ing.origin)
      .map(it => `${asDisplayText(it.displayName)} ${asDisplayText(it.country)}`)
      .join(' ');
    return (
      ingredientName.toLowerCase().includes(q) ||
      originText.toLowerCase().includes(q) ||
      productCode.toLowerCase().includes(q) ||
      menuText.toLowerCase().includes(q)
    );
  });
  return filtered.sort((a, b) =>
    asDisplayText(a.ingredientName).localeCompare(asDisplayText(b.ingredientName), 'ko')
  );
}

/**
 * 메뉴별 원산지 보기 전체 행 목록을 계산합니다 (검색 전 전체 목록).
 * @param {object[]} originIngredients
 * @param {object} mapData - { ingredientToMenus: Map }
 * @param {function} isExcludedMenu - (menuCode, menuName) => boolean
 * @param {string[]} menuOrder
 * @param {object} menuNameOverrides
 * @returns {object[]}
 */
export function buildOriginMenuRows(
  originIngredients,
  mapData,
  isExcludedMenu,
  menuOrder,
  menuNameOverrides
) {
  const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
  // 제품코드 대소문자·표시명 폴백을 알레르기와 동일하게 처리한다.
  const ingByKey = buildIngredientLookup(originIngredients, { requireAllergens: false });

  const menuMap = new Map();
  for (const [key, menus] of ingredientToMenus) {
    if (!(menus instanceof Map)) continue;
    const ing = ingByKey.get(key);
    const origins = asObjectArray(ing?.origin);
    if (!origins.length) continue;
    for (const [menuCode, meta] of menus) {
      if (isExcludedMenu(menuCode, meta?.menuName)) continue;
      if (!menuMap.has(menuCode)) menuMap.set(menuCode, { ...meta, menuCode, origins: [] });
      const existing = menuMap.get(menuCode).origins;
      for (const it of origins) {
        const label = asDisplayText(it.displayName) || asDisplayText(ing.ingredientName);
        const country = asDisplayText(it.country);
        const dup = existing.find(o => o.country === country && o.displayName === label);
        if (!dup) existing.push({ displayName: label, country });
      }
    }
  }

  const sorted = applyOrder(
    [...menuMap.values()],
    menuOrder,
    m => asDisplayText(m.menuCode),
    m => asDisplayText(m.menuName),
    m => getMenuCodeRank(asDisplayText(m.menuCode))
  );
  return sorted.map(m => ({
    ...m,
    originalMenuName: asDisplayText(m.menuName),
    menuName: applyMenuName(
      asDisplayText(m.menuCode),
      asDisplayText(m.menuName),
      menuNameOverrides
    ),
  }));
}
