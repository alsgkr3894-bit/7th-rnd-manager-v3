/**
 * lib/cost/pizza-detail/store.js — cost_pizza_detail CRUD
 *
 * 레코드 구조:
 *   menuCode    'PZ-001-L' 등
 *   menuName    '슈퍼콤비네이션'
 *   size        'L' | 'R'
 *   components  [{ productCode?, ingredientName, quantity, unit, unitPrice, note? }]
 *   note        string
 *   updatedAt   ISO
 */
import { createDetailStore } from '@/lib/cost/shared/createDetailStore';

const store = createDetailStore('cost_pizza_detail', data => ({ size: (data.size || '').trim() }));

export const getAllPizzaRecipes = store.getAll;
export const getPizzaRecipeMap = store.getRecipeMap;
export const upsertPizzaRecipe = store.upsert;
export const deletePizzaRecipe = store.remove;
export const resetAllPizzaRecipes = store.resetAll;
