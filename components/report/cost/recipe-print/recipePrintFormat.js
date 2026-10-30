import { formatNumber } from '@/lib/format';

export function formatQty(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? formatNumber(n) : formatNumber(Math.round(n * 1000) / 1000);
}

export function money(value) {
  return value > 0 ? `${formatNumber(value)}원` : '—';
}

export function formatQtyWithUnit(value, unit) {
  const n = Number(value);
  const safeValue = Number.isFinite(n) ? n : 0;
  return `${formatQty(safeValue)}${unit || 'g'}`;
}

export function formatSizeUsage(component, sizes) {
  const labels = Array.isArray(sizes) && sizes.length ? sizes : ['단일'];
  return labels
    .map(size => {
      const entry = component.sizeQuantities?.[size] || {
        quantity: 0,
        unit: component.unit || 'g',
      };
      return `${size}:${formatQtyWithUnit(entry.quantity, entry.unit || component.unit || 'g')}`;
    })
    .join('/');
}

export function formatIngredientUsage(component, sizes) {
  const name = component.ingredientName || '—';
  return `${name}(${formatSizeUsage(component, sizes)})`;
}

export function directComponentsOf(menu) {
  return (Array.isArray(menu.components) ? menu.components : []).filter(
    component => component.sourceType !== 'common'
  );
}

export function commonComponentsOf(menu) {
  return (Array.isArray(menu.components) ? menu.components : []).filter(
    component => component.sourceType === 'common'
  );
}

export function sectionCost(components) {
  return components.reduce((sum, component) => sum + (component.totalCost || 0), 0);
}

/**
 * 규격이 둘 이상(L/R)인 메뉴의 금액은 규격별로 나란히 보여 준다("L 6,511원 / R 4,916원").
 * L과 R을 더한 값은 어느 규격의 원가도 아니라 읽는 사람이 메뉴 원가로 오해한다(2026-10-30 점검).
 * 규격이 하나면 기존처럼 한 금액.
 */
export function formatSizeMoney(valuesBySize, sizes, fallbackTotal = 0) {
  const labels = Array.isArray(sizes) && sizes.length ? sizes : ['단일'];
  if (labels.length <= 1) {
    const only = valuesBySize?.[labels[0]];
    return money(only != null ? Math.round(only) : fallbackTotal);
  }
  return labels.map(size => `${size} ${money(Math.round(valuesBySize?.[size] || 0))}`).join(' / ');
}

/** 구성품 목록의 규격별 소계 합 */
export function sectionSizeCosts(components) {
  const totals = {};
  for (const component of components) {
    for (const [size, value] of Object.entries(component.sizeSubtotals || {})) {
      totals[size] = (totals[size] || 0) + (Number(value) || 0);
    }
  }
  return totals;
}
