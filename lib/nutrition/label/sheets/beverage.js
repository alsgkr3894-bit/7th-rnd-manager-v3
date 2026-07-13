import {
  allergenNames,
  displayVal,
  LABEL_COLS,
  parseVolumeMl,
  primaryRawValue,
  resolveNutritionGroup,
  roundLabelValue,
  scaleLabelValue,
  sortNutritionLabelMenus,
} from '../_utils.js';

export function buildBeverageSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '음료')
    .map(menu => {
      const raw = primaryRawValue(rawMap, menu.menuCode);
      // 가져오기(base-import) UI는 음료를 basis='serving'(1회분 총량)으로 저장한다.
      // 그 경우 저장값을 그대로 쓴다(용량으로 다시 스케일하면 volMl/100배 부풀려짐).
      // basis가 없으면(구/수동 입력) 100ml 기준값으로 보고 파싱한 용량(ml)으로 환산.
      const isServing = raw.basis === 'serving';
      const volMl = parseVolumeMl(menu.menuName, menu.menuCode);
      const servingWeight = raw.weight != null && raw.weight !== '' ? raw.weight : volMl;
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: isServing ? roundLabelValue(servingWeight ?? '—') : (volMl ?? '—'),
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            isServing
              ? displayVal(raw, key, null)
              : volMl
                ? scaleLabelValue(raw, key, volMl)
                : '—',
          ])
        ),
        allergen,
      };
    });
}
