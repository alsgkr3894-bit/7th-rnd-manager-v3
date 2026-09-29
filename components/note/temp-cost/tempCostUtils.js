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

/**
 * 임시원가 계산기의 원가율 색. 기준(critPct)은 홈·마진표·원가보고서와 같은 공유 설정
 * (원가율 경고선, 기본 40)이다 — 여기만 35로 고정돼 있어 같은 원가율이 화면마다 다른
 * 색으로 보였다. 판정은 다른 화면과 같이 "초과(>)".
 */
export function tempCostRateColor(costRate, critPct = 40) {
  if (costRate == null) return 'var(--text-3)';
  return Number(costRate) > critPct ? 'var(--negative)' : 'var(--positive)';
}
