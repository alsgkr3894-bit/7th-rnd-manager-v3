import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { asDisplayText, asFiniteNumber } from '@/lib/ui/prop-guards';

let rowKey = 0;

function optionalNonNegativeNumber(value) {
  const parsed = parseOptionalNonNegativeNumber(value);
  return parsed.ok ? parsed.value : null;
}

export function createBlankRecipeComponentRow() {
  return {
    _key: ++rowKey,
    ingredientName: '',
    productCode: '',
    quantity: '',
    unit: 'g',
    unitPrice: null,
  };
}

export function copyRecipeComponentRow(component) {
  return { ...component, _key: ++rowKey };
}

export function recipeComponentProductCode(component) {
  return String(component?.productCode || '').trim();
}

export function unitPriceInfoForComponent(component, unitPriceMap) {
  const productCode = recipeComponentProductCode(component);
  return productCode ? unitPriceMap.get(productCode) || null : null;
}

export function hasRecipeComponentIdentity(component) {
  return Boolean(
    asDisplayText(component?.ingredientName).trim() || recipeComponentProductCode(component)
  );
}

export function isRecipeComponentMissingUnitPrice(component, unitPriceMap = new Map()) {
  if (!hasRecipeComponentIdentity(component)) return false;
  const info = unitPriceInfoForComponent(component, unitPriceMap);
  const unitPrice = asFiniteNumber(info?.unitPrice, asFiniteNumber(component?.unitPrice, null));
  return unitPrice == null;
}

export function isRecipeComponentMissingQuantity(component) {
  if (!hasRecipeComponentIdentity(component)) return false;
  return asFiniteNumber(component?.quantity, null) == null;
}

function componentDisplayName(component) {
  return (
    asDisplayText(component?.ingredientName).trim() ||
    recipeComponentProductCode(component) ||
    '이름 없는 구성품'
  );
}

export function buildRecipeValidationDetails(components = [], unitPriceMap = new Map()) {
  const missingQuantityNames = [];
  const missingPriceNames = [];

  for (const component of components) {
    if (!hasRecipeComponentIdentity(component)) continue;
    const name = componentDisplayName(component);
    if (isRecipeComponentMissingQuantity(component)) missingQuantityNames.push(name);
    if (isRecipeComponentMissingUnitPrice(component, unitPriceMap)) missingPriceNames.push(name);
  }

  return {
    missingQuantityNames,
    missingPriceNames,
  };
}

export function hydrateRecipeComponent(component, unitPriceMap) {
  const info = unitPriceInfoForComponent(component, unitPriceMap);
  return {
    ...component,
    _key: ++rowKey,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component?.unit),
    unitPrice: info?.unitPrice ?? component?.unitPrice ?? null,
  };
}

export function buildRecipeComponentForSave(component, unitPriceMap) {
  const productCode = recipeComponentProductCode(component);
  const info = productCode ? unitPriceMap.get(productCode) : null;
  const quantity = optionalNonNegativeNumber(component.quantity);
  const latestUnitPrice = optionalNonNegativeNumber(info?.unitPrice);
  return {
    ingredientName: component.ingredientName || '',
    productCode: productCode || null,
    quantity,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component.unit),
    unitPrice: latestUnitPrice ?? optionalNonNegativeNumber(component.unitPrice),
  };
}

export function unitPriceKeyForIngredient(ingredient) {
  return ingredient?.productCode || (ingredient?.id != null ? String(ingredient.id) : null);
}

export function applyIngredientSuggestionToComponent(component, ingredient, unitPriceMap) {
  const upmKey = unitPriceKeyForIngredient(ingredient);
  const priceInfo = upmKey ? unitPriceMap.get(upmKey) : null;
  return {
    ...component,
    ingredientName: ingredient?.ingredientName || '',
    productCode: ingredient?.productCode || '',
    unit: normalizeCostBaseUnit(priceInfo?.baseUnitType || ingredient?.baseUnitType),
    unitPrice: priceInfo?.unitPrice ?? null,
  };
}
