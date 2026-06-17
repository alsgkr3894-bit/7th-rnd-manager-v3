import {
  allergenNames,
  displayVal,
  LABEL_COLS,
  primaryRawValue,
  resolveNutritionGroup,
  roundLabelValue,
  sortNutritionLabelMenus,
} from '../_utils.js';

export function buildSideSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '사이드')
    .map(menu => {
      const raw = primaryRawValue(rawMap, menu.menuCode);
      const isServing = raw.basis === 'serving';
      const weight = isServing ? (raw.weight ?? '—') : parseFloat(raw.weight) || null;
      const displayWeight = isServing ? roundLabelValue(weight) : roundLabelValue(weight ?? '—');
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: displayWeight,
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            displayVal(raw, key, isServing ? null : weight),
          ])
        ),
        allergen,
      };
    });
}
