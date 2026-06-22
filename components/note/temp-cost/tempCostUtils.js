import { calcUnitPrice } from '@/lib/cost/calc-unit-price';
import { calcCostRate } from '@/lib/cost/rate-color';

const EMPTY_TEMP_COST = { rows: [], sellingPrice: '' };
let tempCostRowSeq = 0;

export function parseTempCost(value) {
  try {
    if (!value) return EMPTY_TEMP_COST;
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      sellingPrice: parsed?.sellingPrice || '',
    };
  } catch {
    return EMPTY_TEMP_COST;
  }
}

export function nonNeg(value) {
  return Number(value) < 0 ? '' : value;
}

function compactText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s/g, '');
}

export function ingredientName(ingredient) {
  return ingredient?.ingredientName || ingredient?.productName || '';
}

export function filterTempCostIngredients(ingredients, search) {
  const query = compactText(search);
  if (!query) return [];

  return (Array.isArray(ingredients) ? ingredients : [])
    .filter(ingredient => {
      const name = compactText(ingredientName(ingredient));
      const code = compactText(ingredient?.productCode);
      return name.includes(query) || code.includes(query);
    })
    .slice(0, 8);
}

export function unitPriceFromIngredient(ingredient) {
  const baseQty = ingredient?.baseQuantity;
  const price = ingredient?.priceOverride ?? ingredient?.priceWithTax ?? ingredient?.price ?? null;
  const unitPrice = calcUnitPrice(price, baseQty);
  return unitPrice != null ? String(unitPrice) : price ? String(Math.round(price)) : '';
}

export function createTempCostRow(ingredient) {
  tempCostRowSeq = (tempCostRowSeq + 1) % 100000;
  return {
    id: `${Date.now()}-${tempCostRowSeq}`,
    ingredientId: ingredient?.id ?? null,
    productCode: ingredient?.productCode || '',
    name: ingredientName(ingredient),
    unit: ingredient?.baseUnitType || 'g',
    quantity: '',
    unitPrice: unitPriceFromIngredient(ingredient),
  };
}

export function findLinkedIngredient(row, ingredients) {
  if (!row) return null;
  const productCode = row.productCode ? String(row.productCode) : '';
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  return (
    safeIngredients.find(ingredient => row.ingredientId && ingredient.id === row.ingredientId) ||
    safeIngredients.find(ingredient => productCode && ingredient.productCode === productCode) ||
    null
  );
}

export function hasLinkedTempCostRows(rows) {
  return (Array.isArray(rows) ? rows : []).some(row => row.productCode || row.ingredientId);
}

export function refreshLinkedTempCostRows(rows, ingredients) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    const ingredient = findLinkedIngredient(row, ingredients);
    if (!ingredient) return row;

    return {
      ...row,
      ingredientId: ingredient.id ?? row.ingredientId ?? null,
      productCode: ingredient.productCode || row.productCode || '',
      name: ingredientName(ingredient) || row.name || '',
      unit: ingredient.baseUnitType || row.unit || 'g',
      unitPrice: unitPriceFromIngredient(ingredient),
    };
  });
}

export function tempCostRowSubtotal(row) {
  return (Number(row?.quantity) || 0) * (Number(row?.unitPrice) || 0);
}

export function calcTempCostSummary(rows, sellingPrice) {
  const totalCost = (Array.isArray(rows) ? rows : []).reduce(
    (sum, row) => sum + tempCostRowSubtotal(row),
    0
  );
  const sellNum = Number(sellingPrice) || 0;
  return { totalCost, costRate: calcCostRate(totalCost, sellNum) };
}

export function tempCostRateColor(costRate) {
  if (costRate == null) return 'var(--text-3)';
  return Number(costRate) > 35 ? 'var(--negative)' : 'var(--positive)';
}
