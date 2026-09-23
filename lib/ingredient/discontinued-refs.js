/**
 * lib/ingredient/discontinued-refs.js — 단종/숨김 식자재가 아직 레시피에 남아있는지 진단
 *
 * 순수 함수. DB 접근 없음. 단종 체크박스(대체 없이)로 처리했거나 대체 연결 이전에 이미
 * 단종됐던 데이터가 여전히 menu_recipes/cost_recipe_groups/cost_edge_dough에 남아있는
 * 경우를 한 번의 순회로 찾는다 — previewIngredientProductReplace를 식자재마다 호출하면
 * 매번 전체 스토어를 다시 스캔하게 되어 비효율적이다.
 */

function text(value) {
  return String(value ?? '').trim();
}

function codeKey(value) {
  return text(value).toUpperCase();
}

/**
 * @param {{ ingredients?: object[], menuRecipes?: object[], recipeGroups?: object[], edges?: object[], menuMasters?: object[] }} data
 * @returns {Array<{
 *   productCode: string,
 *   ingredientName: string,
 *   discontinued: boolean,
 *   excluded: boolean,
 *   replacedByProductCode: string|null,
 *   menuRecipeCount: number,
 *   recipeGroupCount: number,
 *   edgeCount: number,
 *   totalCount: number,
 *   sampleMenuNames: string[],
 * }>} totalCount 내림차순
 */
export function collectDiscontinuedIngredientRefs({
  ingredients = [],
  menuRecipes = [],
  recipeGroups = [],
  edges = [],
  menuMasters = [],
} = {}) {
  // 단종 메뉴의 레시피는 세지 않는다 — 그 메뉴는 원가 보고서·알레르기·원산지 어디에도
  // 나가지 않아 재연결할 게 없는데, 배너에는 "갱신 안 됨"으로 계속 남아 지울 방법이
  // 없었다(2026-09-23 주임님). 메뉴가 되살아나면 상태가 바뀌어 다시 잡힌다.
  const discontinuedMenuCodes = new Set(
    (Array.isArray(menuMasters) ? menuMasters : [])
      .filter(m => text(m?.status) === 'discontinued')
      .map(m => codeKey(m?.menuCode))
      .filter(Boolean)
  );
  const flaggedByCode = new Map();
  for (const ing of Array.isArray(ingredients) ? ingredients : []) {
    const code = codeKey(ing?.productCode);
    if (!code) continue;
    if (!(ing?.discontinued === true || ing?.excluded === true)) continue;
    if (!flaggedByCode.has(code)) flaggedByCode.set(code, ing);
  }
  if (!flaggedByCode.size) return [];

  const counts = new Map();
  for (const code of flaggedByCode.keys()) {
    counts.set(code, { menuRecipe: 0, recipeGroup: 0, edge: 0, menuNames: new Set() });
  }

  for (const recipe of Array.isArray(menuRecipes) ? menuRecipes : []) {
    if (discontinuedMenuCodes.has(codeKey(recipe?.menuCode))) continue;
    for (const c of Array.isArray(recipe?.components) ? recipe.components : []) {
      const code = codeKey(c?.productCode);
      const stat = counts.get(code);
      if (!stat) continue;
      stat.menuRecipe += 1;
      const name = text(recipe?.menuName);
      if (name) stat.menuNames.add(name);
    }
  }

  for (const group of Array.isArray(recipeGroups) ? recipeGroups : []) {
    for (const c of Array.isArray(group?.ingredients) ? group.ingredients : []) {
      const code = codeKey(c?.productCode);
      const stat = counts.get(code);
      if (!stat) continue;
      stat.recipeGroup += 1;
      const name = text(group?.name);
      if (name) stat.menuNames.add(name);
    }
  }

  for (const edge of Array.isArray(edges) ? edges : []) {
    for (const c of Array.isArray(edge?.components) ? edge.components : []) {
      const code = codeKey(c?.productCode);
      const stat = counts.get(code);
      if (!stat) continue;
      stat.edge += 1;
      const name = text(edge?.edgeType);
      if (name) stat.menuNames.add(name);
    }
  }

  const rows = [];
  for (const [code, ing] of flaggedByCode) {
    const stat = counts.get(code) || {
      menuRecipe: 0,
      recipeGroup: 0,
      edge: 0,
      menuNames: new Set(),
    };
    const totalCount = stat.menuRecipe + stat.recipeGroup + stat.edge;
    if (totalCount === 0) continue;
    rows.push({
      productCode: text(ing.productCode),
      ingredientName: ing.ingredientName || ing.displayName || ing.productName || '',
      discontinued: ing.discontinued === true,
      excluded: ing.excluded === true,
      replacedByProductCode: text(ing.replacedByProductCode) || null,
      menuRecipeCount: stat.menuRecipe,
      recipeGroupCount: stat.recipeGroup,
      edgeCount: stat.edge,
      totalCount,
      sampleMenuNames: [...stat.menuNames].slice(0, 3),
    });
  }

  return rows.sort((a, b) => b.totalCount - a.totalCount);
}
