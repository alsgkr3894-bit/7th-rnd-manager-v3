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
  const activeIngredients = asObjectArray(ingredients).filter(
    ingredient => !ingredient.discontinued && !ingredient.excluded
  );
  return {
    totalWithAllergen: activeIngredients.filter(
      ingredient =>
        ingredient.allergenNone === true ||
        (Array.isArray(ingredient.allergens) && ingredient.allergens.length > 0)
    ).length,
    totalIngredients: activeIngredients.length,
  };
}
