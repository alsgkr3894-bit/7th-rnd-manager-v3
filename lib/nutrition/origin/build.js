import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';
import { getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
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
  for (const ing of asObjectArray(ingredients)) {
    const originItems = asObjectArray(ing.origin);
    if (!originItems.length || ing.discontinued || ing.excluded || ing.originHidden) continue;
    const productCode = asDisplayText(ing.productCode);
    const ingredientName = asDisplayText(ing.ingredientName);
    const codeKey = productCode ? `code:${productCode}` : null;
    const nameKey = `name:${ingredientName.trim().toLowerCase().replace(/\s+/g, '')}`;
    const byCode = codeKey ? asMenuMap(ingredientMenuMap.get(codeKey)) : new Map();
    const byName = asMenuMap(ingredientMenuMap.get(nameKey));
    const merged = new Map([...byName, ...byCode]);

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

    result.push({
      ingredientName,
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
  const ingByKey = new Map();
  for (const ing of originIngredients) {
    const productCode = asDisplayText(ing.productCode);
    const ingredientName = asDisplayText(ing.ingredientName);
    if (productCode) ingByKey.set(`code:${productCode}`, ing);
    const n = ingredientName.trim().toLowerCase().replace(/\s+/g, '');
    if (n) ingByKey.set(`name:${n}`, ing);
  }

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
