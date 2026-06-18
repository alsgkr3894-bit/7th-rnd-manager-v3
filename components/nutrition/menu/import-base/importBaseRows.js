import { normalizeNutritionCategory, NUTRITION_CATEGORY_OPTIONS } from '@/lib/nutrition/menu-group';
import { CRUST_TYPES } from '@/lib/nutrition/values/store';

export const CRUST_OPTIONS = CRUST_TYPES;
export const CATEGORY_OPTIONS = NUTRITION_CATEGORY_OPTIONS;
export const NON_PIZZA_CATS = new Set(['사이드', '추가토핑', '음료']);

export function categoryForImportRow(row = {}) {
  const fallback = row.basis === 'serving' ? '사이드' : row.category ? '피자' : '';
  return normalizeNutritionCategory(row.category, fallback);
}
