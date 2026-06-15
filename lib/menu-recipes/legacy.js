/**
 * lib/menu-recipes/legacy.js — menu_recipes compatibility adapter.
 *
 * 새 기준은 menu_recipes 단일 저장소다. 구형 카테고리별 detail store bridge는 제거했다.
 */

import {
  getAllMenuRecipes,
  getMenuRecipeByCode,
  recipeKindForRecord,
  upsertMenuRecipe,
} from './store';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';

export const MENU_RECIPE_KINDS = ['pizza', 'personal', 'side', 'set'];

function emptyRecipeMaps() {
  return Object.fromEntries(MENU_RECIPE_KINDS.map(kind => [kind, new Map()]));
}

export function mergeCanonicalRecipeMaps(canonicalRows) {
  const maps = emptyRecipeMaps();
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

export async function loadMenuRecipeMaps() {
  return mergeCanonicalRecipeMaps(await getAllMenuRecipes());
}

export async function loadMenuRecipeArrays() {
  return recipeArraysFromMaps(await loadMenuRecipeMaps());
}

export async function getMenuRecipeForMenu(menu) {
  const menuCode = String(menu?.menuCode || '').trim();
  if (!menuCode) return null;

  return getMenuRecipeByCode(menuCode);
}

export async function upsertMenuRecipeForMenu(data) {
  const kind = data?.kind || recipeStoreKindForCategory(data?.category);
  const recipeResult = await upsertMenuRecipe({ ...data, kind });
  return { kind, recipeResult };
}
