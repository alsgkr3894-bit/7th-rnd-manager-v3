/**
 * lib/cost/ingredient-menu-map.js — 식자재 ↔ 메뉴 양방향 매핑
 *
 * 순수함수. IO 없음. 단위 테스트 가능.
 *
 * 매칭 소스 (3종):
 *   1. 레시피 직접 구성품 — menu_recipes에서 분리한 category recipe components
 *   2. 공통묶음(groups) — 메뉴 레시피에서 체크한 selectedRecipeGroupIds만 적용
 *   3. 엣지(edges) — 피자 카테고리 전체 메뉴에 적용 (치즈크러스트·도우 등)
 *
 * 사용처:
 *   - 원산지·알레르기 자동 집계 (nutrition 페이지)
 *   - app/ingredient/usage 역매핑 (공통묶음·엣지 포함 버전)
 */

import { groupAppliesToMenu, normalizeRecipeGroupIds } from '@/lib/cost/recipe-groups/effective';
import { isPizzaCategory } from '@/lib/menu-master/category-policy';

/** 공백 제거·소문자 정규화 (식자재명 비교용) */
function normStr(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '');
}

function normCode(s) {
  return s == null ? '' : String(s).trim();
}

function codeKeyVariants(productCode) {
  const code = normCode(productCode);
  if (!code) return [];
  return [...new Set([`code:${code}`, `code:${code.toLowerCase()}`, `code:${code.toUpperCase()}`])];
}

/**
 * 식자재 키 결정.
 *
 * productCode와 ingredientName이 모두 있으면 둘 다 연결한다. 원가레시피의 과거/수기
 * 데이터에서 코드가 비어 있거나 달라도, 식자재관리의 알레르기·원산지 값은 이름으로
 * 폴백 매칭되어야 한다.
 *
 * @param {string|null} productCode
 * @param {string} ingredientName
 * @returns {string[]}
 */
function ingredientKeys(productCode, ingredientName) {
  const keys = [];
  keys.push(...codeKeyVariants(productCode));
  const n = normStr(ingredientName);
  if (n) keys.push(`name:${n}`);
  return [...new Set(keys)];
}

/**
 * 양방향 맵을 업데이트하는 내부 헬퍼.
 * ingredientToMenus: Map<key, Map<menuCode, { menuName, category }>>
 * menuToIngredients: Map<menuCode, Set<key>>
 */
function link(
  ingredientToMenus,
  menuToIngredients,
  key,
  menuCode,
  menuName,
  category,
  source = { type: '직접', name: '' },
  extra = {}
) {
  if (!key || !menuCode) return;

  if (!ingredientToMenus.has(key)) ingredientToMenus.set(key, new Map());
  const menus = ingredientToMenus.get(key);
  const prev = menus.get(menuCode);
  const nextSource = {
    type: source?.type || '직접',
    name: source?.name || '',
  };
  const sources = Array.isArray(prev?.sources) ? [...prev.sources] : [];
  if (!sources.some(s => s.type === nextSource.type && s.name === nextSource.name)) {
    sources.push(nextSource);
  }
  menus.set(menuCode, {
    menuName: prev?.menuName || menuName || '',
    category: prev?.category || category || '',
    size: prev?.size || extra?.size || '',
    sources,
  });

  if (!menuToIngredients.has(menuCode)) menuToIngredients.set(menuCode, new Set());
  menuToIngredients.get(menuCode).add(key);
}

/**
 * 전체 레시피·공통묶음·엣지 데이터로 식자재↔메뉴 양방향 맵을 빌드.
 *
 * @param {{
 *   menuMasters:    Array<{ menuCode, menuName, category }>,
 *   detailRecipes:  Array<{ menuCode, menuName, category?: string, components: Array<{ productCode, ingredientName }> }>,
 *   groups:         Array<{ id, name, defaultCategories?: string[], ingredients: Array<{ productCode, ingredientName, quantities }> }>,
 *   edges:          Array<{ edgeType, components: Array<{ productCode, ingredientName }>, expandInMargin?: boolean }>,
 * }}
 * @returns {{
 *   ingredientToMenus: Map<string, Map<string, { menuName, category }>>,
 *   menuToIngredients: Map<string, Set<string>>,
 * }}
 */
export function buildIngredientMenuMap({
  menuMasters = [],
  detailRecipes = [],
  groups = [],
  edges = [],
  compositions = [],
}) {
  /** @type {Map<string, Map<string, { menuName, category }>>} */
  const ingredientToMenus = new Map();
  /** @type {Map<string, Set<string>>} */
  const menuToIngredients = new Map();

  // ── 1. 레시피 직접 구성품 ────────────────────────────────────
  for (const r of detailRecipes) {
    const { menuCode, menuName, category } = r;
    for (const c of r.components || []) {
      for (const key of ingredientKeys(c.productCode, c.ingredientName)) {
        link(
          ingredientToMenus,
          menuToIngredients,
          key,
          menuCode,
          menuName,
          category || '',
          {
            type: '직접',
            name: '상세 레시피',
          },
          { size: r.size }
        );
      }
    }
  }

  // ── 2-A. 공통묶음 — 메뉴 레시피에서 체크한 묶음만 적용 ──
  const menuMasterByCode = new Map(
    menuMasters.filter(menu => menu?.menuCode).map(menu => [normCode(menu.menuCode), menu])
  );
  const groupById = new Map(
    groups.filter(group => group?.id != null).map(group => [normCode(group.id), group])
  );

  for (const recipe of detailRecipes) {
    const menuCode = normCode(recipe?.menuCode);
    if (!menuCode) continue;

    const selectedGroupIds = normalizeRecipeGroupIds(recipe?.selectedRecipeGroupIds);
    if (!selectedGroupIds.length) continue;

    const masterMenu = menuMasterByCode.get(menuCode) || {};
    const menu = {
      ...masterMenu,
      menuCode,
      menuName: masterMenu.menuName || recipe?.menuName || '',
      category: masterMenu.category || recipe?.category || '',
      size: recipe?.size || masterMenu.size,
    };

    for (const groupId of selectedGroupIds) {
      const grp = groupById.get(groupId);
      if (!grp || !groupAppliesToMenu(grp, menu)) continue;
      for (const ing of grp.ingredients || []) {
        for (const key of ingredientKeys(ing.productCode, ing.ingredientName)) {
          link(
            ingredientToMenus,
            menuToIngredients,
            key,
            menuCode,
            menu.menuName,
            menu.category,
            {
              type: '묶음관리',
              name: grp.name || '',
            },
            { size: menu.size }
          );
        }
      }
    }
  }

  // ── 3. 엣지(edges) — 피자 카테고리 전체 메뉴에 적용 ──────────
  // expandInMargin이 true이거나 미정의(레거시 호환)인 엣지만 포함
  const expandEdges = edges.filter(e => e.expandInMargin == null || e.expandInMargin === true);

  if (expandEdges.length > 0) {
    const pizzaMenus = menuMasters.filter(m =>
      isPizzaCategory(m.category, { includePersonal: false })
    );

    for (const edge of expandEdges) {
      for (const c of edge.components || []) {
        for (const key of ingredientKeys(c.productCode, c.ingredientName)) {
          for (const menu of pizzaMenus) {
            link(
              ingredientToMenus,
              menuToIngredients,
              key,
              menu.menuCode,
              menu.menuName,
              menu.category,
              {
                type: '엣지관리',
                name: `${edge.edgeType || '엣지'}${edge.size ? ` ${edge.size}` : ''}`,
              },
              { size: menu.size }
            );
          }
        }
      }
    }
  }

  // ── 4. 파생 메뉴 식자재 연결 ─────────────────────────────────────
  // compositions의 ingredientCodes(product code)를 파생 menuCode에 링크
  for (const comp of compositions) {
    const { menuCode, menuName } = comp;
    if (!menuCode) continue;
    const masterMenu = menuMasters.find(m => m.menuCode === menuCode);
    const category = masterMenu?.category || '';
    for (const code of Array.isArray(comp.ingredientCodes) ? comp.ingredientCodes : []) {
      for (const key of ingredientKeys(code, '')) {
        link(
          ingredientToMenus,
          menuToIngredients,
          key,
          menuCode,
          menuName || '',
          category,
          {
            type: '파생메뉴',
            name: comp.menuName || menuCode,
          },
          { size: masterMenu?.size }
        );
      }
    }
  }

  return { ingredientToMenus, menuToIngredients };
}

/**
 * ingredientToMenus 맵에서 특정 식자재의 메뉴 목록을 조회.
 * productCode 또는 ingredientName 중 하나로 조회 가능.
 *
 * @param {Map} ingredientToMenus
 * @param {string|null} productCode
 * @param {string} ingredientName
 * @returns {Map<string, { menuName, category }>}
 */
export function getMenusForIngredient(ingredientToMenus, productCode, ingredientName) {
  const code = normCode(productCode);
  const name = normStr(ingredientName);
  const keys = [];
  if (name) keys.push(`name:${name}`);
  if (code) keys.push(...codeKeyVariants(code));
  const merged = new Map();
  for (const key of keys) {
    const menus = ingredientToMenus.get(key);
    if (!(menus instanceof Map)) continue;
    for (const [k, v] of menus) merged.set(k, v);
  }
  return merged;
}
