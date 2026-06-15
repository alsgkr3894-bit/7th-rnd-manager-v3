/**
 * lib/menu-recipes/legacy.js — menu_recipes compatibility adapter.
 *
 * 새 기준은 menu_recipes 단일 저장소다. 카테고리별 detail store 읽기/쓰기 bridge는
 * 명시적으로 요청한 경우에만 사용한다.
 */

import {
  getAllMenuRecipes,
  getMenuRecipeByCode,
  recipeKindForRecord,
  upsertMenuRecipe,
} from './store';
import { getAllPizzaRecipes, upsertPizzaRecipe } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes, upsertPersonalRecipe } from '@/lib/cost/personal-detail';
import { getAllSideRecipes, upsertSideRecipe } from '@/lib/cost/side-detail';
import { getAllSetRecipes, upsertSetRecipe } from '@/lib/cost/set-detail';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';

export const MENU_RECIPE_KINDS = ['pizza', 'personal', 'side', 'set'];

const LEGACY_APIS = {
  pizza: { getAll: getAllPizzaRecipes, upsert: upsertPizzaRecipe },
  personal: { getAll: getAllPersonalRecipes, upsert: upsertPersonalRecipe },
  side: { getAll: getAllSideRecipes, upsert: upsertSideRecipe },
  set: { getAll: getAllSetRecipes, upsert: upsertSetRecipe },
};

function emptyRecipeMaps() {
  return Object.fromEntries(MENU_RECIPE_KINDS.map(kind => [kind, new Map()]));
}

function mapRows(rows) {
  return new Map((Array.isArray(rows) ? rows : []).filter(row => row.menuCode).map(row => [
    row.menuCode,
    row,
  ]));
}

export function mergeCanonicalRecipeMaps(canonicalRows, baseMaps = {}) {
  const maps = emptyRecipeMaps();
  for (const kind of MENU_RECIPE_KINDS) {
    const base = baseMaps?.[kind];
    if (base instanceof Map) {
      for (const [menuCode, recipe] of base.entries()) maps[kind].set(menuCode, recipe);
    }
  }

  for (const recipe of Array.isArray(canonicalRows) ? canonicalRows : []) {
    const kind = recipeKindForRecord(recipe);
    if (!kind || !maps[kind] || !recipe.menuCode) continue;
    maps[kind].set(recipe.menuCode, recipe);
  }
  return maps;
}

export function recipeArraysFromMaps(recipeMaps = {}) {
  return Object.fromEntries(
    MENU_RECIPE_KINDS.map(kind => [
      kind,
      recipeMaps?.[kind] instanceof Map ? [...recipeMaps[kind].values()] : [],
    ])
  );
}

export async function loadLegacyRecipeMaps() {
  const [pizzaRows, personalRows, sideRows, setRows] = await Promise.all([
    getAllPizzaRecipes(),
    getAllPersonalRecipes(),
    getAllSideRecipes(),
    getAllSetRecipes(),
  ]);
  return {
    pizza: mapRows(pizzaRows),
    personal: mapRows(personalRows),
    side: mapRows(sideRows),
    set: mapRows(setRows),
  };
}

export async function loadMenuRecipeMaps({ includeLegacyFallback = false } = {}) {
  const [canonicalRows, legacyMaps] = await Promise.all([
    getAllMenuRecipes(),
    includeLegacyFallback ? loadLegacyRecipeMaps() : Promise.resolve(emptyRecipeMaps()),
  ]);
  return mergeCanonicalRecipeMaps(canonicalRows, legacyMaps);
}

export async function loadMenuRecipeArrays(options) {
  return recipeArraysFromMaps(await loadMenuRecipeMaps(options));
}

export async function getMenuRecipeForMenu(menu, { includeLegacyFallback = false } = {}) {
  const menuCode = String(menu?.menuCode || '').trim();
  if (!menuCode) return null;

  const canonical = await getMenuRecipeByCode(menuCode);
  if (canonical) return canonical;

  if (!includeLegacyFallback) return null;

  const kind = recipeStoreKindForCategory(menu?.category);
  const api = LEGACY_APIS[kind];
  if (!api) return null;

  const legacy = (await api.getAll()).find(row => row.menuCode === menuCode);
  if (!legacy) return null;
  return {
    ...legacy,
    category: menu?.category || legacy.category || '',
    kind,
    displayGroupKey: menu?.displayGroupKey || legacy.displayGroupKey || menuCode,
    source: legacy.source || 'legacy-detail',
  };
}

export async function upsertMenuRecipeForMenu(data, { mirrorLegacy = false } = {}) {
  const kind = data?.kind || recipeStoreKindForCategory(data?.category);
  const recipeResult = await upsertMenuRecipe({ ...data, kind });
  let legacyResult = null;

  if (mirrorLegacy && kind && LEGACY_APIS[kind]) {
    legacyResult = await LEGACY_APIS[kind].upsert({
      menuCode: data.menuCode,
      menuName: data.menuName,
      size: data.size || '단일',
      components: data.components,
      note: data.note,
    });
  }

  return { kind, recipeResult, legacyResult };
}
