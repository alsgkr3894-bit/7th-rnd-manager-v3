import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const ALLERGEN_NAME = Object.fromEntries(
  ALLERGEN_SEED.map(({ allergenCode, allergenName }) => [allergenCode, allergenName])
);

function normalizeKey(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s/g, '');
}

function unique(values) {
  return [...new Set(values.map(value => asDisplayText(value).trim()).filter(Boolean))];
}

function componentName(component) {
  return (
    asDisplayText(component?.ingredientName).trim() ||
    asDisplayText(component?.productCode).trim() ||
    '이름 없는 구성품'
  );
}

function buildIngredientLookup(ingredients = []) {
  const byCode = new Map();
  const byName = new Map();

  for (const ingredient of asObjectArray(ingredients)) {
    const codeKey = normalizeKey(ingredient?.productCode);
    const nameKey = normalizeKey(ingredient?.ingredientName || ingredient?.productName);
    if (codeKey) byCode.set(codeKey, ingredient);
    if (nameKey) byName.set(nameKey, ingredient);
  }

  return { byCode, byName };
}

function findIngredient(component, lookup) {
  const codeKey = normalizeKey(component?.productCode);
  if (codeKey && lookup.byCode.has(codeKey)) return lookup.byCode.get(codeKey);
  const nameKey = normalizeKey(component?.ingredientName);
  if (nameKey && lookup.byName.has(nameKey)) return lookup.byName.get(nameKey);
  return null;
}

function originLabels(ingredient) {
  if (ingredient?.originHidden === true) return [];
  return asObjectArray(ingredient?.origin)
    .map(item => {
      const displayName = asDisplayText(item?.displayName).trim();
      const country = asDisplayText(item?.country).trim();
      if (!country) return '';
      return displayName ? `${displayName} ${country}` : country;
    })
    .filter(Boolean);
}

function allergenLabels(ingredient) {
  return asStringArray(ingredient?.allergens)
    .map(code => ALLERGEN_NAME[code] || code)
    .filter(Boolean);
}

export function buildRecipeImpactPreview(components = [], ingredients = []) {
  const lookup = buildIngredientLookup(ingredients);
  const directComponents = asObjectArray(components).filter(
    component =>
      asDisplayText(component?.ingredientName).trim() ||
      asDisplayText(component?.productCode).trim()
  );

  const missingOriginNames = [];
  const missingAllergenNames = [];
  const unmatchedNames = [];
  const originOutputLabels = [];
  const allergenOutputLabels = [];
  let linkedIngredientCount = 0;
  let originRegisteredCount = 0;
  let allergenRegisteredCount = 0;

  for (const component of directComponents) {
    const name = componentName(component);
    const ingredient = findIngredient(component, lookup);
    if (!ingredient) {
      unmatchedNames.push(name);
      missingOriginNames.push(name);
      missingAllergenNames.push(name);
      continue;
    }

    linkedIngredientCount += 1;

    const origins = originLabels(ingredient);
    if (origins.length) {
      originRegisteredCount += 1;
      originOutputLabels.push(...origins);
    } else {
      missingOriginNames.push(name);
    }

    const allergens = allergenLabels(ingredient);
    if (allergens.length) {
      allergenRegisteredCount += 1;
      allergenOutputLabels.push(...allergens);
    } else {
      missingAllergenNames.push(name);
    }
  }

  return {
    componentCount: directComponents.length,
    linkedIngredientCount,
    originRegisteredCount,
    allergenRegisteredCount,
    missingOriginNames: unique(missingOriginNames),
    missingAllergenNames: unique(missingAllergenNames),
    unmatchedNames: unique(unmatchedNames),
    originOutputLabels: unique(originOutputLabels),
    allergenOutputLabels: unique(allergenOutputLabels),
  };
}
