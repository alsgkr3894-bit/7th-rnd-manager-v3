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
