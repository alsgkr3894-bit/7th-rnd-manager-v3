import { simpleTotalCost } from '@/lib/cost/shared/calc';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { recipeStoreKindForCategory } from './sync';

export function normalizeIngredientName(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

export function buildIngredientIndex(ingredients) {
  const byCode = new Map();
  const byName = new Map();
  for (const ing of asObjectArray(ingredients)) {
    const productCode = asDisplayText(ing.productCode);
    if (productCode) byCode.set(productCode, ing);
    const name = normalizeIngredientName(ing.ingredientName || ing.productName);
    if (name && !byName.has(name)) byName.set(name, ing);
  }
  return { byCode, byName };
}

export function findIngredientForComponent(component, ingredientIndex) {
  const productCode = asDisplayText(component?.productCode);
  if (productCode && ingredientIndex?.byCode?.has(productCode)) {
    return ingredientIndex.byCode.get(productCode);
  }
  const name = normalizeIngredientName(component?.ingredientName);
  return name ? ingredientIndex?.byName?.get(name) || null : null;
}

export function findIngredientByInput(value, ingredientIndex) {
  const text = asDisplayText(value);
  return (
    ingredientIndex?.byName?.get(normalizeIngredientName(text)) ||
    ingredientIndex?.byCode?.get(text) ||
    null
  );
}

export function buildRecipeMap(rows) {
  return new Map(asObjectArray(rows).filter(row => row.menuCode).map(row => [row.menuCode, row]));
}

export function deriveComponentInfo(components, ingredientIndex) {
  const allergenCodes = new Set();
  const originMap = new Map();
  for (const component of asObjectArray(components)) {
    const ing = findIngredientForComponent(component, ingredientIndex);
    if (!ing || ing.discontinued || ing.excluded) continue;
    asStringArray(ing.allergens).forEach(code => allergenCodes.add(code));
    for (const origin of asObjectArray(ing.origin)) {
      const displayName = asDisplayText(origin.displayName) || asDisplayText(ing.ingredientName);
      const country = asDisplayText(origin.country);
      if (!displayName && !country) continue;
      originMap.set(`${displayName}|${country}`, { displayName, country });
    }
  }
  return {
    allergenCodes: [...allergenCodes],
    origins: [...originMap.values()],
  };
}

export function buildRecipeMasterRows({ menuRows, recipeMaps, ingredientIndex }) {
  return asObjectArray(menuRows)
    .map(menu => {
      const kind = recipeStoreKindForCategory(menu.category);
      const recipe = kind ? recipeMaps?.[kind]?.get(menu.menuCode) || null : null;
      const components = asObjectArray(recipe?.components);
      const derived = deriveComponentInfo(components, ingredientIndex);
      return {
        menu,
        kind,
        recipe,
        components,
        allergenCount: derived.allergenCodes.length,
        originCount: derived.origins.length,
        cost: recipe ? simpleTotalCost(recipe) : 0,
      };
    })
    .filter(row => row.kind);
}

export function filterRecipeMasterRows(rows, search) {
  const q = asDisplayText(search).trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(row => {
    const menu = row.menu;
    return (
      asDisplayText(menu.menuCode).toLowerCase().includes(q) ||
      asDisplayText(menu.menuName).toLowerCase().includes(q) ||
      asDisplayText(menu.category).toLowerCase().includes(q)
    );
  });
}

export function calcComponentsCost(components) {
  return asObjectArray(components).reduce(
    (sum, component) =>
      sum + (Number(component.quantity) || 0) * (Number(component.unitPrice) || 0),
    0
  );
}
