import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export function normStr(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

function unique(values) {
  return [...new Set(values.map(value => asDisplayText(value).trim()).filter(Boolean))];
}

export function codeKeyVariants(productCode) {
  const code = asDisplayText(productCode).trim();
  if (!code) return [];
  return unique([`code:${code}`, `code:${code.toLowerCase()}`, `code:${code.toUpperCase()}`]);
}

export function nameKeyVariants(...values) {
  return unique(values)
    .map(value => normStr(value))
    .filter(Boolean)
    .map(value => `name:${value}`);
}

export function ingredientNameValues(ingredient) {
  return unique([
    ingredient?.ingredientName,
    ingredient?.displayName,
    ingredient?.productName,
    ingredient?.name,
  ]);
}

export function componentNameValues(component) {
  return unique([
    component?.ingredientName,
    component?.displayName,
    component?.productName,
    component?.name,
    component?.toppingName,
    component?.menuName,
  ]);
}

export function addIngredientLookupKeys(map, ingredient) {
  if (!(map instanceof Map) || !ingredient) return map;
  for (const key of codeKeyVariants(ingredient.productCode)) map.set(key, ingredient);
  for (const key of nameKeyVariants(...ingredientNameValues(ingredient))) map.set(key, ingredient);
  return map;
}

export function buildIngredientLookup(ingredients, options = {}) {
  const requireAllergens = options.requireAllergens !== false;
  const skipInactive = options.skipInactive !== false;
  const map = new Map();

  for (const ingredient of asObjectArray(ingredients)) {
    if (skipInactive && (ingredient.discontinued || ingredient.excluded)) continue;
    if (requireAllergens && !asStringArray(ingredient.allergens).length) continue;
    addIngredientLookupKeys(map, ingredient);
  }

  return map;
}

export function findIngredientByComponent(lookup, component) {
  if (!(lookup instanceof Map) || !component) return null;
  for (const key of codeKeyVariants(component.productCode)) {
    const ingredient = lookup.get(key);
    if (ingredient) return ingredient;
  }
  for (const key of nameKeyVariants(...componentNameValues(component))) {
    const ingredient = lookup.get(key);
    if (ingredient) return ingredient;
  }
  return null;
}
