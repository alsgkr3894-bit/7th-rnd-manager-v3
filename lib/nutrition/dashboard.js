/**
 * lib/nutrition/dashboard.js — 영양성분·원산지 섹션 대시보드용 요약 집계
 *
 * 메뉴 영양성분 입력률, 알레르기/원산지 커버리지를 요약한다.
 * store 미존재/빈 데이터에서도 안전하게 0 반환.
 */

import { getAllMenuRefs, getAllRawValues, getAllCompositions } from './values/store.js';
import { getAllOrigins } from './origin/store.js';
import { getAllIngredients } from '../ingredient';

/**
 * @returns {Promise<{
 *   menuCount: number,        // 등록된 메뉴 수
 *   nutritionDone: number,    // 베이스 영양성분 입력된 메뉴 수
 *   nutritionRate: number,    // 입력률 %
 *   allergenRate: number,     // 알레르기 정보 커버리지 %
 *   originMissing: number,    // 원산지 미등록 식자재 수
 *   compositionCount: number, // 파생(조합) 메뉴 수
 * }>}
 */
export async function getNutritionDashboard() {
  const [menus, rawValues, comps, origins, ingredients] = await Promise.all([
    getAllMenuRefs().catch(() => []),
    getAllRawValues().catch(() => []),
    getAllCompositions().catch(() => []),
    getAllOrigins().catch(() => []),
    getAllIngredients().catch(() => []),
  ]);

  const menuCount = menus.length;
  // 베이스 영양성분이 1개 이상 입력된 메뉴 = rawValues에 menuCode가 존재
  const filledCodes = new Set(rawValues.map(r => r.menuCode).filter(Boolean));
  const nutritionDone = menus.filter(m => filledCodes.has(m.menuCode)).length;

  // 활성 식자재 기준 커버리지 (단종·제외 제외)
  const activeIngredients = ingredients.filter(r => !r.discontinued && !r.excluded);
  const ingCount = activeIngredients.length;
  const activeIds = new Set(activeIngredients.map(r => r.id));

  // 알레르기는 cost_ingredients.allergens 배열 기준 (CL2 이후 단일 출처)
  const allergenLinked = activeIngredients.filter(
    r => Array.isArray(r.allergens) && r.allergens.length > 0
  ).length;
  const originLinked = origins.filter(o => activeIds.has(o.ingredientId)).length;

  return {
    menuCount,
    nutritionDone,
    nutritionRate: menuCount > 0 ? Math.round((nutritionDone / menuCount) * 100) : 0,
    allergenRate: ingCount > 0 ? Math.round((allergenLinked / ingCount) * 100) : 0,
    originMissing: Math.max(0, ingCount - originLinked),
    compositionCount: comps.length,
  };
}
