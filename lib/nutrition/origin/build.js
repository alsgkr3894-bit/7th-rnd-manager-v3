import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';

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
