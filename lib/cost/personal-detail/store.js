/**
 * lib/cost/personal-detail/store.js — cost_personal_detail CRUD
 * 1인피자: size 구분 없음 (단일 규격). menuCode 기준 1 record / 1 메뉴.
 */
import { createDetailStore } from '@/lib/cost/shared/createDetailStore';

const store = createDetailStore('cost_personal_detail');

export const getAllPersonalRecipes = store.getAll;
export const getPersonalRecipeMap = store.getRecipeMap;
export const upsertPersonalRecipe = store.upsert;
export const deletePersonalRecipe = store.remove;
export const resetAllPersonalRecipes = store.resetAll;
