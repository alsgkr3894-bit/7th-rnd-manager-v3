import {
  EDGE_VARIANTS,
  PERSONAL_PIZZA_CRUST_CODE,
  REGULAR_PIZZA_CRUST_TYPES,
  SERVING_CRUST_TYPE,
  SIDE_BASE_CRUST,
} from '@/lib/nutrition/crust-config';
import { isPersonalPizzaMenu } from '@/lib/nutrition/menu-group';
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
    const hasA = a?.[key] !== '' && a?.[key] != null;
    const hasB = b?.[key] !== '' && b?.[key] != null;
    if (!hasA && !hasB) return;
    const va = parseFloat(a?.[key]) || 0;
    const vb = parseFloat(b?.[key]) || 0;
    result[key] = Math.round((va + vb) * 10) / 10;
  });
  return result;
}

/**
 * 베이스(100g 기준) + 엣지(한판 기준 절대 총량)를 합쳐 "합산 한판"의 100g 기준 값을 만든다.
 *
 * 입력 단위가 서로 다르다:
 *   - base: 영양값은 100g 기준, weight는 한판 총중량(g)
 *   - edge: weight는 한판에 추가되는 엣지 중량(g), 영양값은 그 엣지 전체의 절대 총량
 *
 * 100g 밀도끼리 더한 뒤 총중량을 곱하면 엣지 밀도가 피자 전체 중량에 퍼진 것처럼
 * 계산되어 크게 부풀려지므로(예: 2배 이상), 반드시 총량으로 환산해 합친 뒤
 * 합산 중량으로 다시 나눠 100g 기준을 만든다.
 *
 * 반환: { weight: 합산 총중량, ...각 영양값(100g 기준) }
 * base 중량이 없으면 엣지를 배분할 수 없으므로 base 값을 그대로 반환한다.
 */
export function combineBaseWithEdge(base, edge) {
  const baseW = parseFloat(base?.weight);
  if (!(baseW > 0)) return { ...(base || {}) };
  // 엣지 조정값이 하나도 없으면(엣지 마스터 미입력) 합산할 게 없다 — 석쇠 값을 그대로 돌려주면
  // 치즈크러스트 행에 석쇠 영양값이 찍혔다. 빈 결과를 돌려 '미입력'으로 보이게 한다.
  const edgeHasData = NUTRITION_FIELDS.some(({ key }) => {
    const v = edge?.[key];
    return v !== '' && v != null;
  });
  if (!edgeHasData) return {};
  const edgeW = parseFloat(edge?.weight) || 0;
  const totalW = baseW + edgeW;

  const result = { weight: totalW };
  NUTRITION_FIELDS.forEach(({ key }) => {
    if (key === 'weight') return;
    const hasBase = base?.[key] !== '' && base?.[key] != null;
    const hasEdge = edge?.[key] !== '' && edge?.[key] != null;
    if (!hasBase && !hasEdge) return;
    // 베이스 값이 비어 있으면 엣지 값만으로 100g 값을 지어내지 않는다(미입력 그대로)
    if (!hasBase) return;
    const basePer100 = parseFloat(base?.[key]) || 0;
    const edgeTotal = parseFloat(edge?.[key]) || 0;
    const combinedTotal = (basePer100 * baseW) / 100 + edgeTotal;
    result[key] = Math.round((combinedTotal / totalW) * 100 * 10) / 10;
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

    // 비피자 메뉴는 단품 슬롯만 노출한다. 기존 석쇠L 저장값은 호환용 fallback.
    if (!isPizza) {
      const base =
        rawMap[`${menu.menuCode}__${SERVING_CRUST_TYPE}`] ||
        rawMap[`${menu.menuCode}__석쇠L`] ||
        {};
      results.push({
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        crustType: SERVING_CRUST_TYPE,
        isDerived: false,
        ...base,
      });
      return;
    }

    // 1인용피자는 전용 슬롯 한 행뿐이다(석쇠·씬·엣지 행이 없다)
    if (isPersonalPizzaMenu(menu, masterByCode)) {
      results.push({
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        crustType: PERSONAL_PIZZA_CRUST_CODE,
        isDerived: false,
        ...(rawMap[`${menu.menuCode}__${PERSONAL_PIZZA_CRUST_CODE}`] || {}),
      });
      return;
    }

    // 피자 베이스 3종
    REGULAR_PIZZA_CRUST_TYPES.forEach(ct => {
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
        ...combineBaseWithEdge(baseForSide[side], edge),
      });
    });
  });

  // 파생 메뉴
  compositions.forEach(comp => {
    const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode);
    if (!baseMenu) return;
    const isPizza = _isPizzaMenu(baseMenu, masterByCode);

    if (!isPizza) {
      const base =
        rawMap[`${comp.baseMenuCode}__${SERVING_CRUST_TYPE}`] ||
        rawMap[`${comp.baseMenuCode}__석쇠L`] ||
        {};
      results.push({
        menuCode: comp.menuCode,
        menuName: comp.menuName,
        baseMenuCode: comp.baseMenuCode,
        crustType: SERVING_CRUST_TYPE,
        isDerived: true,
        baseMenuName: baseMenu.menuName,
        ...base,
      });
      return;
    }

    // 파생 메뉴 영양값은 식자재 영양값으로 자동계산하지 않고 베이스 메뉴 직접 입력값을 따른다.
    if (isPersonalPizzaMenu(baseMenu, masterByCode)) {
      results.push({
        menuCode: comp.menuCode,
        menuName: comp.menuName,
        baseMenuCode: comp.baseMenuCode,
        crustType: PERSONAL_PIZZA_CRUST_CODE,
        isDerived: true,
        baseMenuName: baseMenu.menuName,
        ...(rawMap[`${comp.baseMenuCode}__${PERSONAL_PIZZA_CRUST_CODE}`] || {}),
      });
      return;
    }
    REGULAR_PIZZA_CRUST_TYPES.forEach(ct => {
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
        ...combineBaseWithEdge(baseForSide[side], edge),
      });
    });
  });

  return results;
}
