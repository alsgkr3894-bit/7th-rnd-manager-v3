/**
 * lib/menu-recipes/legacy.js — canonical menu_recipes adapter.
 *
 * menu_recipes가 1차 기준이고, 카테고리별 detail store는 기존 화면 호환을 위한
 * 읽기 fallback 및 저장 mirror로만 사용한다.
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

export async function loadMenuRecipeMaps({ includeLegacyFallback = true } = {}) {
  const [canonicalRows, legacyMaps] = await Promise.all([
    getAllMenuRecipes(),
    includeLegacyFallback ? loadLegacyRecipeMaps() : Promise.resolve(emptyRecipeMaps()),
  ]);
  return mergeCanonicalRecipeMaps(canonicalRows, legacyMaps);
}

export async function getMenuRecipeForMenu(menu) {
  const menuCode = String(menu?.menuCode || '').trim();
  if (!menuCode) return null;

  const canonical = await getMenuRecipeByCode(menuCode);
  if (canonical) return canonical;

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

export async function upsertMenuRecipeForMenu(data, { mirrorLegacy = true } = {}) {
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
