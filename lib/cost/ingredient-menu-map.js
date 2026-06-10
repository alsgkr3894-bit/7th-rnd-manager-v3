/**
 * lib/cost/ingredient-menu-map.js — 식자재 ↔ 메뉴 양방향 매핑
 *
 * 순수함수. IO 없음. 단위 테스트 가능.
 *
 * 매칭 소스 (3종):
 *   1. 레시피 직접 구성품 — pizza/personal/side/set-detail.components[], cost_recipes.ingredients[]
 *   2. 공통묶음(groups) — defaultCategories/groupIds 기반으로 해당 메뉴 전체에 적용
 *   3. 엣지(edges) — 피자 카테고리 전체 메뉴에 적용 (치즈크러스트·도우 등)
 *
 * 사용처:
 *   - 원산지·알레르기 자동 집계 (nutrition 페이지)
 *   - app/ingredient/usage 역매핑 (공통묶음·엣지 포함 버전)
 */

import { catCompatible } from './margin/matching.js';

/** 공백 제거·소문자 정규화 (식자재명 비교용) */
function normStr(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '');
}

/** 피자 카테고리 판정 (엣지가 적용될 카테고리) */
const PIZZA_CATS = new Set([
  '피자',
  '피자/프리미엄 스페셜',
  '피자/프리미엄',
  '피자/오리지널',
  '피자/하프앤하프',
]);

/**
 * 식자재 키 결정 (productCode 우선, 없으면 정규화된 재료명)
 * @param {string|null} productCode
 * @param {string} ingredientName
 * @returns {string|null}
 */
function ingredientKey(productCode, ingredientName) {
  if (productCode) return `code:${productCode}`;
  const n = normStr(ingredientName);
  return n ? `name:${n}` : null;
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
  source = { type: '직접', name: '' }
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
 *   oldRecipes:     Array<{ menuCode, menuName, menuCategory, ingredients: Array<{ productCode, ingredientName }>, groupIds?: number[] }>,
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
  oldRecipes = [],
  groups = [],
  edges = [],
}) {
  /** @type {Map<string, Map<string, { menuName, category }>>} */
  const ingredientToMenus = new Map();
  /** @type {Map<string, Set<string>>} */
  const menuToIngredients = new Map();

  // ── 1. 레시피 직접 구성품 ────────────────────────────────────
  // detail 레시피 (pizza/personal/side/set-detail) — menuCode 단위
  for (const r of detailRecipes) {
    const { menuCode, menuName, category } = r;
    for (const c of r.components || []) {
      const key = ingredientKey(c.productCode, c.ingredientName);
      link(ingredientToMenus, menuToIngredients, key, menuCode, menuName, category || '', {
        type: '직접',
        name: '상세 레시피',
      });
    }
  }

  // 구형 레시피 (cost_recipes)
  for (const r of oldRecipes) {
    const { menuCode, menuName, menuCategory, groupIds } = r;
    const category = (menuCategory || '').split('/')[0];
    for (const ing of r.ingredients || []) {
      const key = ingredientKey(ing.productCode, ing.ingredientName);
      link(ingredientToMenus, menuToIngredients, key, menuCode, menuName, category, {
        type: '직접',
        name: '구형 레시피',
      });
    }

    // ── 2-B. 구형 레시피에 연결된 공통묶음(groupIds 명시) ────
    if (Array.isArray(groupIds)) {
      for (const gid of groupIds) {
        const grp = groups.find(g => g.id === gid);
        if (!grp) continue;
        for (const ing of grp.ingredients || []) {
          const key = ingredientKey(ing.productCode, ing.ingredientName);
          link(ingredientToMenus, menuToIngredients, key, menuCode, menuName, category, {
            type: '묶음관리',
            name: grp.name || '',
          });
        }
      }
    }
  }

  // ── 2-A. 공통묶음(defaultCategories) — 해당 카테고리 모든 메뉴에 적용 ──
  for (const grp of groups) {
    const defCats = grp.defaultCategories || [];
    if (!defCats.length) continue;

    // menuMasters에서 호환 카테고리 메뉴 수집
    const targetMenus = menuMasters.filter(m =>
      defCats.some(dc => catCompatible(m.category || '', dc))
    );

    for (const menu of targetMenus) {
      for (const ing of grp.ingredients || []) {
        const key = ingredientKey(ing.productCode, ing.ingredientName);
        link(ingredientToMenus, menuToIngredients, key, menu.menuCode, menu.menuName, menu.category, {
          type: '묶음관리',
          name: grp.name || '',
        });
      }
    }
  }

  // ── 3. 엣지(edges) — 피자 카테고리 전체 메뉴에 적용 ──────────
  // expandInMargin이 true이거나 미정의(레거시 호환)인 엣지만 포함
  const expandEdges = edges.filter(e => e.expandInMargin == null || e.expandInMargin === true);

  if (expandEdges.length > 0) {
    const pizzaMenus = menuMasters.filter(m => PIZZA_CATS.has(m.category || ''));

    for (const edge of expandEdges) {
      for (const c of edge.components || []) {
        const key = ingredientKey(c.productCode, c.ingredientName);
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
            }
          );
        }
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
  const byCode = productCode ? ingredientToMenus.get(`code:${productCode}`) : null;
  const byName = ingredientToMenus.get(`name:${normStr(ingredientName)}`);
  if (!byCode && !byName) return new Map();
  if (byCode && !byName) return byCode;
  if (!byCode && byName) return byName;
  // 합집합 (code 우선)
  const merged = new Map(byName);
  for (const [k, v] of byCode) merged.set(k, v);
  return merged;
}
