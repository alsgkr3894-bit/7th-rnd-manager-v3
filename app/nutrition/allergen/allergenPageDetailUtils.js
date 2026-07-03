import { buildDetailRows } from '@/lib/nutrition/allergen/matrix';
import { buildIngredientLookup } from '@/lib/nutrition/allergen/ingredient-lookup';
import { asObjectArray } from '@/lib/ui/prop-guards';

export function buildIngredientByKey(allergenIngredients) {
  return buildIngredientLookup(allergenIngredients);
}

export function buildAllergenDetailRows(detailRow, baseMapData, edges, allergenIngredients) {
  return buildDetailRows(detailRow, baseMapData, edges, buildIngredientByKey(allergenIngredients));
}

export function buildAllergenSummaryCounts(ingredients, allergenIngredients) {
  return {
    totalWithAllergen: allergenIngredients.length,
    totalIngredients: asObjectArray(ingredients).filter(
      ingredient => !ingredient.discontinued && !ingredient.excluded
    ).length,
  };
}
