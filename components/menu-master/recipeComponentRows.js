import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { asDisplayText, asFiniteNumber } from '@/lib/ui/prop-guards';
import { findIngredientByUniqueName } from '@/lib/cost/shared/ingredient-price-key';

let rowKey = 0;

function optionalNonNegativeNumber(value) {
  const parsed = parseOptionalNonNegativeNumber(value);
  return parsed.ok ? parsed.value : null;
}

function optionalPositiveNumber(value) {
  const parsed = parseOptionalNonNegativeNumber(value);
  if (!parsed.ok) return null;
  return parsed.value == null || parsed.value > 0 ? parsed.value : null;
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
  const quantity = asFiniteNumber(component?.quantity, null);
  return quantity == null || quantity <= 0;
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
  const quantity = optionalPositiveNumber(component.quantity);
  const latestUnitPrice = optionalNonNegativeNumber(info?.unitPrice);
  return {
    ingredientName: component.ingredientName || '',
    productCode: productCode || null,
    quantity,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component.unit),
    unitPrice: latestUnitPrice ?? optionalNonNegativeNumber(component.unitPrice),
  };
}

export function buildSavableRecipeComponents(components = [], unitPriceMap = new Map()) {
  return components
    .filter(hasRecipeComponentIdentity)
    .map(component => buildRecipeComponentForSave(component, unitPriceMap));
}

// 입력 중 표시(_typed)는 화면 상태일 뿐 — 식자재를 고르거나 연결을 마치면 지운다.
function withoutTypedFlag(component) {
  const rest = { ...(component || {}) };
  delete rest._typed;
  return rest;
}

export function unitPriceKeyForIngredient(ingredient) {
  return ingredient?.productCode || (ingredient?.id != null ? String(ingredient.id) : null);
}

export function applyIngredientSuggestionToComponent(component, ingredient, unitPriceMap) {
  const upmKey = unitPriceKeyForIngredient(ingredient);
  const priceInfo = upmKey ? unitPriceMap.get(upmKey) : null;
  const rest = withoutTypedFlag(component);
  return {
    ...rest,
    ingredientName: ingredient?.ingredientName || '',
    productCode: ingredient?.productCode || '',
    unit: normalizeCostBaseUnit(priceInfo?.baseUnitType || ingredient?.baseUnitType),
    unitPrice: priceInfo?.unitPrice ?? null,
  };
}

/**
 * 식자재명 칸을 직접 고쳐 쓸 때의 행 변환.
 *
 * 기존 행은 이미 식자재(제품코드·단가)에 연결돼 있어, 이름만 바꾸면 화면엔 새 이름이 보여도
 * 저장·원가·알레르기는 옛 식자재로 계산됐다(2026-09-30 "기존 구성품을 바꾸면 적용이 안 돼서
 * 삭제 후 새로 등록해야 한다"). 연결된 행을 고쳐 쓰면 연결을 끊고, 칸을 벗어날 때
 * linkTypedIngredientByName이 이름이 정확히 일치하는 식자재에 다시 연결한다.
 * 식자재에 없는 이름으로 직접 입력한 수동 구성품은 입력해 둔 단가를 유지한다.
 */
export function applyTypedIngredientName(component, value, allIngredients = []) {
  const next = { ...component, ingredientName: value, _typed: true };
  const linked =
    Boolean(recipeComponentProductCode(component)) ||
    Boolean(findIngredientByUniqueName(allIngredients, component?.ingredientName));
  return linked ? { ...next, productCode: '', unitPrice: null } : next;
}

/** 직접 입력한 이름이 사용 중인 식자재 하나와 정확히 일치하면 그 식자재로 연결한다. */
export function linkTypedIngredientByName(
  component,
  allIngredients = [],
  unitPriceMap = new Map()
) {
  if (!component?._typed) return component;
  const match = findIngredientByUniqueName(allIngredients, component.ingredientName);
  if (match) return applyIngredientSuggestionToComponent(component, match, unitPriceMap);
  return withoutTypedFlag(component);
}
