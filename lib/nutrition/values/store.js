/**
 * lib/nutrition/values/store.js — 영양성분 값 CRUD re-export facade
 *
 * nutrition_raw_values — 베이스 영양성분 (lab 제공값)
 * nutrition_edge_master — 엣지 추가값
 * nutrition_topping_master — 소스/토핑 영양성분
 * nutrition_menu_ref — 메뉴 목록
 * nutrition_pizza_composition — 파생 메뉴
 * nutrition_set_composition — 세트 구성
 *
 * 구현은 각 책임 파일에 분산됨:
 *   raw-values.js      — nutrition_raw_values CRUD + clearAllBaseData + 중복진단
 *   menu-refs.js       — nutrition_menu_ref CRUD (cascade → raw-values)
 *   edge.js            — nutrition_edge_master CRUD
 *   topping.js         — nutrition_topping_master CRUD
 *   composition.js     — nutrition_pizza_composition CRUD
 *   set-composition.js — nutrition_set_composition CRUD (읽기/수리 분리)
 */

export { NUTRITION_FIELDS, addNutrition, calcAllResults } from './calc';
export { buildRawValueMapFromRows, buildNutritionBaseDuplicateDiagnostics } from './dedup';

export {
  CRUST_TYPES,
  CRUST_DISPLAY_NAMES,
  EDGE_CODES,
  EDGE_NAMES,
  NUTRITION_EDGE_GROUPS,
} from '@/lib/nutrition/crust-config';

export {
  getAllRawValues,
  getRawValueMap,
  upsertRawValue,
  bulkUpsertBaseData,
  deleteRawValue,
  deleteRawValuesByMenuCode,
  clearAllBaseData,
  getNutritionBaseDuplicateDiagnostics,
  repairNutritionBaseDuplicates,
} from './raw-values';

export {
  getAllMenuRefs,
  upsertMenuRef,
  deleteMenuRef,
  deleteMenuRefsByMenuCode,
  deleteMenuRefsByMenuCodes,
} from './menu-refs';

export { getAllEdges, getEdgeMap, upsertEdge } from './edge';

export { getAllToppings, upsertTopping, deleteTopping } from './topping';

export { getAllCompositions, upsertComposition, deleteComposition } from './composition';

export {
  getAllSetCompositions,
  repairSetCompositions,
  upsertSetComposition,
  deleteSetComposition,
} from './set-composition';
