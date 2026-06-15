import { CRUST_TYPES, EDGE_VARIANTS, SIDE_BASE_CRUST } from '@/lib/nutrition/crust-config';
import {
  isBeverageCategory,
  isSideCategory,
  isExtraToppingCategory,
  isSetCategory,
  isHalfAndHalfCategory,
} from '@/lib/menu-master/category-policy';

export const NUTRITION_FIELDS = [
  { key: 'weight', label: '중량', unit: 'g' },
  { key: 'kcal', label: '열량', unit: 'kcal' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'sugar', label: '당류', unit: 'g' },
  { key: 'fat', label: '조지방', unit: 'g' },
  { key: 'satFat', label: '포화지방', unit: 'g' },
  { key: 'transFat', label: '트랜스지방', unit: 'g' },
  { key: 'cholesterol', label: '콜레스테롤', unit: 'mg' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
];

/** 두 영양성분 객체를 더하는 유틸 (순수 함수) */
export function addNutrition(a, b) {
  const result = {};
  NUTRITION_FIELDS.forEach(({ key }) => {
    const va = parseFloat(a?.[key]) || 0;
    const vb = parseFloat(b?.[key]) || 0;
    result[key] = Math.round((va + vb) * 10) / 10;
  });
  return result;
}

/** @private masterByCode 미제공 시 모두 피자로 간주 (하위 호환) */
function _isPizzaMenu(menu, masterByCode) {
  if (!masterByCode) return true;
  const cat = masterByCode[menu.menuCode]?.category || menu.category || '';
  return (
    !isBeverageCategory(cat) &&
    !isSideCategory(cat) &&
    !isExtraToppingCategory(cat) &&
    !isSetCategory(cat) &&
    !isHalfAndHalfCategory(cat)
  );
}

/**
 * 메뉴×크러스트 전체 계산 결과 반환 (순수 함수)
 *
 * @param {object} opts
 * @param {Array}  opts.menus
 * @param {object} opts.rawMap
 * @param {object} opts.edgeMap
 * @param {Array}  opts.compositions
 * @param {object} [opts.masterByCode] - menuCode → master 레코드. 제공 시 피자만 엣지 행 추가.
 * @returns {Array<{ menuCode, menuName, crustType, ...nutrition }>}
 */
export function calcAllResults({ menus, rawMap, edgeMap, compositions, masterByCode }) {
  const results = [];

  menus.forEach(menu => {
    const isPizza = _isPizzaMenu(menu, masterByCode);

    // 베이스 3종
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${menu.menuCode}__${ct}`] || {};
      results.push({
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        crustType: ct,
        isDerived: false,
        ...base,
      });
    });

    // 엣지 4종 — 피자 전용 (masterByCode 미제공 시 기존 동작 유지)
    if (isPizza) {
      const baseForSide = {
        L: rawMap[`${menu.menuCode}__${SIDE_BASE_CRUST.L}`] || {},
        R: rawMap[`${menu.menuCode}__${SIDE_BASE_CRUST.R}`] || {},
      };
      EDGE_VARIANTS.forEach(({ crustType, edgeCode, side }) => {
        const edge = edgeMap[edgeCode] || {};
        results.push({
          menuCode: menu.menuCode,
          menuName: menu.menuName,
          crustType,
          isDerived: false,
          ...addNutrition(baseForSide[side], edge),
        });
      });
    }
  });

  // 파생 메뉴
  compositions.forEach(comp => {
    const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode);
    if (!baseMenu) return;
    const isPizza = _isPizzaMenu(baseMenu, masterByCode);

    // 파생 메뉴 영양값은 식자재 영양값으로 자동계산하지 않고 베이스 메뉴 직접 입력값을 따른다.
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${comp.baseMenuCode}__${ct}`] || {};
      results.push({
        menuCode: comp.menuCode,
        menuName: comp.menuName,
        baseMenuCode: comp.baseMenuCode,
        crustType: ct,
        isDerived: true,
        baseMenuName: baseMenu.menuName,
        ...base,
      });
    });

    // 엣지 4종 — 베이스 메뉴 직접 입력값 + 엣지 조정값만 사용한다.
    if (isPizza) {
      const baseForSide = {
        L: rawMap[`${comp.baseMenuCode}__${SIDE_BASE_CRUST.L}`] || {},
        R: rawMap[`${comp.baseMenuCode}__${SIDE_BASE_CRUST.R}`] || {},
      };
      EDGE_VARIANTS.forEach(({ crustType, edgeCode, side }) => {
        const edge = edgeMap[edgeCode] || {};
        results.push({
          menuCode: comp.menuCode,
          menuName: comp.menuName,
          baseMenuCode: comp.baseMenuCode,
          crustType,
          isDerived: true,
          baseMenuName: baseMenu.menuName,
          ...addNutrition(baseForSide[side], edge),
        });
      });
    }
  });

  return results;
}
