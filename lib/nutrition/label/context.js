/**
 * lib/nutrition/label/context.js — 영양성분 출력(라벨)에 필요한 공통 컨텍스트.
 *
 * app/nutrition/export/NutritionLabelResult.jsx(전체 라벨 출력 페이지)의
 * 데이터 로딩·알레르기 집계 로직을 그대로 뽑아냈다 — 메뉴마스터의 "영양성분
 * 출력 미리보기"(단일 메뉴)도 여기서 나온 값을 그대로 써야 실제 출력과
 * 같은 값을 보여줄 수 있다.
 *
 * 원산지 집계·정렬·메뉴명 오버라이드 등 전체 출력 페이지 전용 로직은 여기 없다
 * — 호출부가 masters/groups/costEdges/detailRecipes를 그대로 돌려받아
 * 필요하면 이어서 쓴다.
 */
import { initDB } from '@/lib/db';
import {
  getAllMenuRefs,
  getRawValueMap,
  getAllEdges,
  getAllToppings,
} from '@/lib/nutrition/values/store';
import { getAllEdges as getCostEdges } from '@/lib/cost/edge-dough';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import {
  buildEdgeAllergenMap,
  buildMenuAllergenMap,
  buildToppingAllergenMap,
} from '@/lib/nutrition/allergen/aggregate';
import { asObjectArray } from '@/lib/ui/prop-guards';

export async function buildNutritionLabelContext() {
  await initDB();
  const [menuRefs, rawMap, edgeList, toppingList, masters, ings, groups, costEdges, recipeArrays] =
    await Promise.all([
      getAllMenuRefs(),
      getRawValueMap(),
      getAllEdges(),
      getAllToppings(),
      getAllMenuMaster(),
      getAllIngredients(),
      getAllRecipeGroups(),
      getCostEdges(),
      loadMenuRecipeArrays(),
    ]);

  const masterByCode = Object.fromEntries(masters.map(m => [m.menuCode, m]));
  const edgeMap = Object.fromEntries(edgeList.map(e => [e.edgeCode, e]));

  // 알레르기 집계 — 메뉴 기본 알레르기와 엣지별 알레르기를 분리해 행별로 합산
  const detailRecipes = tagDetailRecipes(
    asObjectArray(recipeArrays.pizza),
    asObjectArray(recipeArrays.personal),
    asObjectArray(recipeArrays.side),
    asObjectArray(recipeArrays.set)
  );
  const { ingredientToMenus } = buildIngredientMenuMap({
    menuMasters: masters,
    detailRecipes,
    groups,
    edges: [],
    compositions: [],
  });
  const menuAllergenMap = buildMenuAllergenMap({ ingredients: ings, ingredientToMenus });
  const edgeAllergenMap = buildEdgeAllergenMap({ ingredients: ings, edges: costEdges });
  const toppingAllergenMap = buildToppingAllergenMap({ ingredients: ings, toppings: toppingList });

  return {
    menuRefs,
    rawMap,
    edgeMap,
    masterByCode,
    menuAllergenMap,
    edgeAllergenMap,
    toppingAllergenMap,
    toppings: toppingList,
    // 원산지 집계 등 호출부 전용 로직이 재사용할 수 있도록 원본 데이터도 함께 반환한다.
    masters,
    ings,
    groups,
    costEdges,
    detailRecipes,
  };
}
