import {
  allergenNames,
  labelFieldValue,
  LABEL_COLS,
  parseVolumeMl,
  primaryRawValue,
  resolveNutritionGroup,
  roundLabelValue,
  sortNutritionLabelMenus,
} from '../_utils.js';

export function buildBeverageSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '음료')
    .map(menu => {
      const raw = primaryRawValue(rawMap, menu.menuCode);
      // 음료는 입력 화면(베이스 입력·가져오기) 모두 "1병/캔 전체(1회 제공량)" 값을 받는다.
      // 예전엔 basis 플래그가 없는 행을 100ml 기준값으로 보고 파싱한 용량(ml)으로 다시
      // 곱했는데, basis 플래그가 생기기 전에 저장된 행(1회분 총량)이 12.5배(1.25L)로 부풀려
      // 출력되는 사고가 났다 — 음료는 언제나 저장값 그대로 쓰고, 용량은 중량이 비었을 때
      // 표시용으로만 쓴다.
      const volMl = parseVolumeMl(menu.menuName, menu.menuCode);
      const servingWeight = raw.weight != null && raw.weight !== '' ? raw.weight : volMl;
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: roundLabelValue(servingWeight ?? '—'),
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => {
            const value = labelFieldValue(raw, key);
            return [key, value === '' || value == null ? '—' : roundLabelValue(value)];
          })
        ),
        allergen,
      };
    });
}
