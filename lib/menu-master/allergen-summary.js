/**
 * lib/menu-master/allergen-summary.js — 메뉴마스터 목록의 "알레르기" 열용 경량 로더.
 *
 * 메뉴별 알레르기 "매트릭스"는 별도 저장소가 아니라 레시피 기준으로 식자재 알레르기를
 * 집계한 계산 결과다(lib/nutrition/allergen/aggregate.js buildMenuAllergenMap). 영양성분
 * 라벨 출력용 buildNutritionLabelContext(lib/nutrition/label/context.js)는 raw_values 등
 * 영양성분 전용 스토어까지 함께 읽어 이 목록 열 하나를 위해 쓰기엔 무겁다 — 여기서는
 * 기본 레시피(직접 구성품)만으로 가볍게 계산한다(엣지·파생메뉴 등 확장은 제외 — "기본
 * 레시피 기준" 요청에 맞춤).
 */
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { buildMenuAllergenMap, allergenNames } from '@/lib/nutrition/allergen/aggregate';
import { MENU_RECIPE_SUMMARY_STATUS } from '@/lib/menu-master/recipe-summary';

/**
 * @param {Array} menus - getAllMenuMaster() 결과
 * @returns {Promise<Map<string, Set<string>>>} menuCode → Set<allergenCode>
 */
export async function loadMenuAllergenMap(menus) {
  const [ingredients, groups, recipeArrays] = await Promise.all([
    getAllIngredients(),
    getAllRecipeGroups(),
    loadMenuRecipeArrays(),
  ]);
  const detailRecipes = tagDetailRecipes(
    recipeArrays.pizza,
    recipeArrays.personal,
    recipeArrays.side,
    recipeArrays.set
  );
  const { ingredientToMenus } = buildIngredientMenuMap({
    menuMasters: menus,
    detailRecipes,
    groups,
    edges: [],
    compositions: [],
  });
  return buildMenuAllergenMap({ ingredients, ingredientToMenus });
}

/**
 * 메뉴 한 건의 알레르기 표시용 라벨.
 * @param {string} menuCode
 * @param {Map<string, Set<string>>} allergenMap - loadMenuAllergenMap() 결과
 * @param {{status?: string}|undefined} recipeSummary - recipeSummaryMap.get(menuCode)
 * @returns {string} '밀, 대두' | '—' | '레시피 없음'
 */
export function menuAllergenLabel(menuCode, allergenMap, recipeSummary) {
  if (!recipeSummary || recipeSummary.status === MENU_RECIPE_SUMMARY_STATUS.MISSING) {
    return '레시피 없음';
  }
  const set = allergenMap instanceof Map ? allergenMap.get(menuCode) : null;
  const names = allergenNames(set);
  return names || '—';
}
