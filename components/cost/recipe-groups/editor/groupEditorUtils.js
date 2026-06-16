import { formatNumber } from '@/lib/format';
import { MENU_CATEGORIES } from '@/lib/recipe';

export const GROUP_EDITOR_CATEGORIES = [...new Set([...MENU_CATEGORIES, '기타'])];

export function buildIngredientQuantities(sizeLabels = []) {
  const quantities = {};
  sizeLabels.forEach(sizeLabel => {
    quantities[sizeLabel] = '';
  });
  return quantities;
}

export function createGroupIngredientLine(meta, unitPriceMap, sizeLabels = []) {
  const key = meta.productCode || (meta.id != null ? String(meta.id) : '');
  const info = unitPriceMap.get(key);
  return {
    productCode: key,
    ingredientName: meta.ingredientName || '',
    quantities: buildIngredientQuantities(sizeLabels),
    unitType: info?.baseUnitType || meta.baseUnitType || 'g',
  };
}

export function computeGroupCostBySizes(ingredients = [], sizeLabels = [], unitPriceMap) {
  const result = {};
  for (const sizeLabel of sizeLabels) {
    result[sizeLabel] = ingredients.reduce((acc, line) => {
      const info = unitPriceMap.get(line.productCode);
      if (!info?.unitPrice) return acc;
      const qty = parseFloat(line.quantities?.[sizeLabel]) || 0;
      return acc + (qty ? info.unitPrice * qty : 0);
    }, 0);
  }
  return result;
}

export function getLineSubtotal(line, sizeLabel, unitPriceMap) {
  const info = unitPriceMap.get(line.productCode);
  const qty = line.quantities?.[sizeLabel] ?? '';
  const qn = parseFloat(qty);
  if (info?.unitPrice == null || !Number.isFinite(qn) || qn === 0) return null;
  return Math.round(info.unitPrice * qn * 10) / 10;
}

export function formatUnitPrice(unitPrice) {
  if (unitPrice == null) return '—';
  return `${unitPrice < 1 ? unitPrice.toFixed(2) : formatNumber(unitPrice)}원`;
}

export function formatSubtotal(subtotal) {
  return subtotal != null ? `${formatNumber(subtotal)}원` : '—';
}

export function formatGroupTotal(total) {
  return total !== 0 ? `${formatNumber(Math.round(total))}원` : '—';
}
