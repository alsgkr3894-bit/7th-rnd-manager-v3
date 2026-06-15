import { parseMenuCode } from '@/lib/cost/menu-price/code';

const text = value => (value == null ? '' : String(value).trim());
const compact = value => text(value).toLowerCase().replace(/\s+/g, '');

function stripTrailingSizeLabel(value) {
  return text(value).replace(/\s+[LR]$/i, '').trim();
}

export function hasDetailRecipeComponents(recipe) {
  return (Array.isArray(recipe?.components) ? recipe.components : []).some(
    component =>
      text(component?.productCode) ||
      text(component?.ingredientName) ||
      text(component?.productName)
  );
}

export function hasLegacyRecipeIngredients(recipe) {
  return (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []).some(
    ingredient => text(ingredient?.productCode) || text(ingredient?.ingredientName)
  );
}

export function menuCodeIdentityKeys(menuCode) {
  const code = text(menuCode);
  if (!code) return [];
  const keys = [`code:${code}`];
  const parsed = parseMenuCode(code);
  if (parsed?.size) {
    keys.push(`code:${parsed.prefix}-${String(parsed.base).padStart(3, '0')}`);
  }
  return [...new Set(keys)];
}

export function recipeIdentityKeys(recipe) {
  const keys = [...menuCodeIdentityKeys(recipe?.menuCode)];
  const rawName = text(recipe?.menuName || recipe?.setName);
  const names = [rawName, stripTrailingSizeLabel(rawName)]
    .map(compact)
    .filter(Boolean);
  for (const name of [...new Set(names)]) keys.push(`name:${name}`);
  return [...new Set(keys)];
}

export function buildActiveDetailRecipeKeySet(detailRecipes) {
  const keys = new Set();
  for (const recipe of Array.isArray(detailRecipes) ? detailRecipes : []) {
    if (!hasDetailRecipeComponents(recipe)) continue;
    for (const key of recipeIdentityKeys(recipe)) keys.add(key);
  }
  return keys;
}

export function recipeMatchesKeySet(recipe, keySet) {
  if (!(keySet instanceof Set) || keySet.size === 0) return false;
  return recipeIdentityKeys(recipe).some(key => keySet.has(key));
}
