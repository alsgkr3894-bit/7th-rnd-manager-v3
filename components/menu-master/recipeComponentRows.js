import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';

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
