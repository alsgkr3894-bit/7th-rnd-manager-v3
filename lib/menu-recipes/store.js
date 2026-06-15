/**
 * lib/menu-recipes/store.js — menu_recipes canonical CRUD.
 *
 * 새 기준: brand DB 안에서 menuCode 1개당 레시피 1개.
 * 카테고리별 detail store는 임시 호환/mirror 대상으로만 둔다.
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { normalizeComponent } from '@/lib/cost/shared/store';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { getActiveBrandId } from '@/lib/active-brand';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';

export const MENU_RECIPES_STORE = 'menu_recipes';

const storeObj = tx => tx.objectStore(MENU_RECIPES_STORE);
const text = value => String(value ?? '').trim();

export function recipeKindForRecord(record) {
  return text(record?.kind) || recipeStoreKindForCategory(record?.category);
}

export function normalizeMenuRecipeComponents(components) {
  return (Array.isArray(components) ? components : [])
    .map(normalizeComponent)
    .filter(component => component.productCode || component.ingredientName);
}

export function buildMenuRecipeRecord(data, existing = null) {
  const menuCode = text(data?.menuCode || existing?.menuCode);
  const category = text(data?.category ?? existing?.category);
  const kind = text(data?.kind) || recipeStoreKindForCategory(category) || text(existing?.kind);
  const displayGroupKey =
    text(data?.displayGroupKey) || text(existing?.displayGroupKey) || menuCode;

  return {
    brandId: text(data?.brandId) || text(existing?.brandId) || getActiveBrandId(),
    menuCode,
    displayGroupKey,
    menuName: text(data?.menuName ?? existing?.menuName),
    category,
    kind: kind || null,
    size: text(data?.size ?? existing?.size) || '단일',
    components: normalizeMenuRecipeComponents(data?.components ?? existing?.components),
    note: text(data?.note ?? existing?.note),
    source: text(data?.source) || text(existing?.source) || 'menu-recipes',
    updatedAt: new Date().toISOString(),
  };
}

export async function getAllMenuRecipes() {
  if (!hasStore(MENU_RECIPES_STORE)) return [];
  const rows = await getAll(MENU_RECIPES_STORE);
  return rows.sort((a, b) => {
    const ra = getMenuCodeRank(a.menuCode);
    const rb = getMenuCodeRank(b.menuCode);
    if (ra !== rb) return ra - rb;
    return text(a.menuName).localeCompare(text(b.menuName), 'ko');
  });
}

export async function getMenuRecipeMap() {
  const rows = await getAllMenuRecipes();
  return new Map(rows.filter(row => row.menuCode).map(row => [row.menuCode, row]));
}

export async function getMenuRecipeByCode(menuCode) {
  const code = text(menuCode);
  if (!code) return null;
  return (await getAllMenuRecipes()).find(row => row.menuCode === code) || null;
}

export async function upsertMenuRecipe(data) {
  if (!hasStore(MENU_RECIPES_STORE)) throw new Error(`${MENU_RECIPES_STORE} store 없음`);
  const menuCode = text(data?.menuCode);
  if (!menuCode) throw new Error('menuCode가 필요합니다');

  const result = {};

  await runTransaction([MENU_RECIPES_STORE], 'readwrite', tx => {
    const store = storeObj(tx);

    const writeRecord = existing => {
      if (existing) {
        store.put({
          ...existing,
          ...buildMenuRecipeRecord(data, existing),
          id: existing.id,
        });
        result.id = existing.id;
        result.mode = 'update';
        return;
      }

      const addReq = store.add(buildMenuRecipeRecord(data));
      addReq.onsuccess = () => {
        result.id = addReq.result;
        result.mode = 'insert';
      };
    };

    const lookupByMenuCode = () => {
      const codeReq = store.index('menuCode').get(menuCode);
      codeReq.onsuccess = () => writeRecord(codeReq.result || null);
    };

    if (data?.id) {
      const idReq = store.get(data.id);
      idReq.onsuccess = () => {
        if (idReq.result) writeRecord(idReq.result);
        else lookupByMenuCode();
      };
      return;
    }

    lookupByMenuCode();
  });

  return result;
}

export async function deleteMenuRecipe(id) {
  if (!hasStore(MENU_RECIPES_STORE)) throw new Error(`${MENU_RECIPES_STORE} store 없음`);
  await runTransaction([MENU_RECIPES_STORE], 'readwrite', tx => {
    storeObj(tx).delete(id);
  });
}

export async function deleteMenuRecipeByMenuCode(menuCode) {
  const row = await getMenuRecipeByCode(menuCode);
  if (!row) return { deleted: 0 };
  await deleteMenuRecipe(row.id);
  return { deleted: 1 };
}

export async function resetAllMenuRecipes() {
  if (!hasStore(MENU_RECIPES_STORE)) return { deleted: 0 };
  const all = await getAll(MENU_RECIPES_STORE);
  await runTransaction([MENU_RECIPES_STORE], 'readwrite', tx => {
    storeObj(tx).clear();
  });
  return { deleted: all.length };
}
