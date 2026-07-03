import {
  allergenNames,
  LABEL_COLS,
  parseVolumeMl,
  primaryRawValue,
  resolveNutritionGroup,
  scaleLabelValue,
  sortNutritionLabelMenus,
} from '../_utils.js';

export function buildBeverageSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '음료')
    .map(menu => {
      const raw = primaryRawValue(rawMap, menu.menuCode);
      const volMl = parseVolumeMl(menu.menuName, menu.menuCode);
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: volMl ?? '—',
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            volMl ? scaleLabelValue(raw, key, volMl) : '—',
          ])
        ),
        allergen,
      };
    });
}
