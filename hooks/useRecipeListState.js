'use client';
import { useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { KEYS } from '@/lib/note/keys';
import { MENU_CATEGORIES } from '@/lib/recipe';

function getRecipeSearchText(recipe, groups) {
  const ownIngredients = (recipe.ingredients || [])
    .map(i => `${i.ingredientName || ''} ${i.productCode || ''}`)
    .join(' ');
  const activeGroups = groups.filter(g => {
    if (Array.isArray(recipe.groupIds)) return recipe.groupIds.includes(g.id);
    return (g.defaultCategories || []).some(
      c => (recipe.menuCategory || '') === c || (recipe.menuCategory || '').startsWith(c + '/')
    );
  });
  const groupText = activeGroups
    .map(g =>
      [
        g.name || '',
        g.description || '',
        ...(g.ingredients || []).map(i => `${i.ingredientName || ''} ${i.productCode || ''}`),
      ].join(' ')
    )
    .join(' ');
  return [
    recipe.menuName,
    recipe.menuCode,
    recipe.menuCategory,
    recipe.note,
    ownIngredients,
    groupText,
  ]
    .join(' ')
    .toLowerCase();
}

function normalizeRecipeSort(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, ids]) => Array.isArray(ids))
      .map(([cat, ids]) => [
        cat,
        ids.filter(id => typeof id === 'string' || typeof id === 'number'),
      ])
      .filter(([, ids]) => ids.length > 0)
  );
}

/**
 * 원가 레시피 목록의 검색·커스텀 정렬·드래그 상태 + 파생 데이터(그룹핑·페이지네이션)를 관리.
 * 데이터 로드는 useRecipeWorkbenchData가, 에디터/CRUD는 페이지가 담당.
 */
export function useRecipeListState({ recipes, allGroups, initialSearch = '' }) {
  const [search, setSearch] = useState(initialSearch);
  const [customOrder, setCustomOrder] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return normalizeRecipeSort(JSON.parse(localStorage.getItem(KEYS.RECIPE_SORT) || '{}'));
    } catch {
      return {};
    }
  });
  const [dragSrc, setDragSrc] = useState(null); // { cat, fromIdx }
  const [dropTarget, setDropTarget] = useState(null); // { cat, beforeIdx }

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(r => getRecipeSearchText(r, allGroups).includes(q));
  }, [recipes, search, allGroups]);

  const orderedRecipes = useMemo(() => {
    const map = new Map();
    for (const r of filteredRecipes) {
      const cat = r.menuCategory || '기타';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    }
    const order = [...MENU_CATEGORIES, '기타'];
    const sorted = [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b, 'ko');
    });
    // 커스텀 순서 적용
    return sorted.map(([cat, items]) => {
      const ids = customOrder[cat];
      if (!ids?.length) return [cat, items];
      const byId = new Map(items.map(r => [r.id, r]));
      const ordered = ids.map(id => byId.get(id)).filter(Boolean);
      const inOrder = new Set(ids);
      const rest = items.filter(r => !inOrder.has(r.id)); // 새로 추가된 항목
      return [cat, [...ordered, ...rest]];
    });
  }, [filteredRecipes, customOrder]);

  const flattenedRecipes = useMemo(
    () => orderedRecipes.flatMap(([, items]) => items),
    [orderedRecipes]
  );

  const {
    page: recipePage,
    goTo: recipeGoTo,
    totalPages: recipeTotalPages,
    paged: pagedRecipes,
    total: recipeTotal,
  } = usePagination(flattenedRecipes, 40);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of pagedRecipes) {
      const cat = r.menuCategory || '기타';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    }
    const order = [...MENU_CATEGORIES, '기타'];
    return [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b, 'ko');
    });
  }, [pagedRecipes]);

  function saveOrder(cat, items) {
    const newOrder = { ...customOrder, [cat]: items.map(r => r.id) };
    setCustomOrder(newOrder);
    try {
      localStorage.setItem(KEYS.RECIPE_SORT, JSON.stringify(newOrder));
    } catch {}
  }
  function resetCatOrder(cat) {
    const { [cat]: _removed, ...rest } = customOrder;
    setCustomOrder(rest);
    try {
      localStorage.setItem(KEYS.RECIPE_SORT, JSON.stringify(rest));
    } catch {}
  }

  return {
    search,
    setSearch,
    customOrder,
    saveOrder,
    resetCatOrder,
    dragSrc,
    setDragSrc,
    dropTarget,
    setDropTarget,
    filteredRecipes,
    grouped,
    recipePage,
    recipeGoTo,
    recipeTotalPages,
    recipeTotal,
  };
}
