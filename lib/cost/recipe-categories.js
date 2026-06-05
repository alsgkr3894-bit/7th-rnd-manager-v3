/**
 * lib/cost/recipe-categories.js — 상품 상세 레시피 카테고리 라벨
 *
 * 피자/1인피자/사이드/세트박스 상세 레시피를 합쳐 buildIngredientMenuMap 입력으로
 * 쓸 때 category 태그를 붙인다. 영양성분(원산지·알레르기·내보내기) 공용.
 */

export const RECIPE_CATEGORY = {
  PIZZA: '피자',
  PERSONAL: '1인피자',
  SIDE: '사이드',
  SET: '세트박스',
};

/** 상세 레시피 4종에 category를 태깅해 단일 배열로 합친다. */
export function tagDetailRecipes(pizza, personal, side, set) {
  return [
    ...(pizza || []).map(r => ({ ...r, category: RECIPE_CATEGORY.PIZZA })),
    ...(personal || []).map(r => ({ ...r, category: RECIPE_CATEGORY.PERSONAL })),
    ...(side || []).map(r => ({ ...r, category: RECIPE_CATEGORY.SIDE })),
    ...(set || []).map(r => ({ ...r, category: RECIPE_CATEGORY.SET })),
  ];
}
