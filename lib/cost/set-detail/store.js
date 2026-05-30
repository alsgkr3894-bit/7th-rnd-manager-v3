/**
 * lib/cost/set-detail/store.js — cost_set_detail CRUD
 * 스키마 인덱스가 setName이므로 extraFields에서 menuName을 setName으로 복사.
 */
import { createDetailStore } from '@/lib/cost/shared/createDetailStore';

const store = createDetailStore(
  'cost_set_detail',
  (data) => ({ setName: (data.menuName || '').trim() }), // schema index 호환
);

export const getAllSetRecipes   = store.getAll;
export const getSetRecipeMap    = store.getRecipeMap;
export const upsertSetRecipe    = store.upsert;
export const deleteSetRecipe    = store.remove;
export const resetAllSetRecipes = store.resetAll;
