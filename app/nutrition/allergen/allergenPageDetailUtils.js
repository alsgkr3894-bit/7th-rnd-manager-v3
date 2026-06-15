import { buildDetailRows, normStr } from '@/lib/nutrition/allergen/matrix';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function buildIngredientByKey(allergenIngredients) {
  const map = new Map();
  for (const ingredient of allergenIngredients) {
    const productCode = asDisplayText(ingredient.productCode);
    if (productCode) map.set(`code:${productCode}`, ingredient);
    const nameKey = normStr(ingredient.ingredientName);
    if (nameKey) map.set(`name:${nameKey}`, ingredient);
  }
  return map;
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
