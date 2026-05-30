/**
 * lib/cost/side-detail/store.js — cost_side_detail CRUD
 */
import { createDetailStore } from '@/lib/cost/shared/createDetailStore';

const store = createDetailStore('cost_side_detail');

export const getAllSideRecipes   = store.getAll;
export const getSideRecipeMap    = store.getRecipeMap;
export const upsertSideRecipe    = store.upsert;
export const deleteSideRecipe    = store.remove;
export const resetAllSideRecipes = store.resetAll;
