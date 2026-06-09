import { asDisplayText, asObjectArray, clampInteger } from './prop-guards';

export const SORT_DIRECTION_ASC = 'asc';
export const SORT_DIRECTION_DESC = 'desc';

const noop = () => {};

export function normalizeSortValue(value) {
  return asDisplayText(value);
}

export function normalizeSortDirection(direction) {
  return direction === SORT_DIRECTION_ASC ? SORT_DIRECTION_ASC : SORT_DIRECTION_DESC;
}

export function normalizeSortChangeHandler(onChange) {
  return typeof onChange === 'function' ? onChange : noop;
}

export function normalizeSortOptions(options) {
  return asObjectArray(options).map((option, index) => {
    const id = normalizeSortValue(option.id);

    return {
      id,
      key: id || `option-${index}`,
      label: asDisplayText(option.label, id),
    };
  });
}

export function getSortButtonClassName(optionId, value) {
  return `chip${normalizeSortValue(value) === normalizeSortValue(optionId) ? ' active' : ''}`;
}

export function getSortIndicator(sortKey, active, direction) {
  const safeSortKey = normalizeSortValue(sortKey);
  const isActive = normalizeSortValue(active) === safeSortKey;

  if (!isActive) {
    return {
      active: false,
      symbol: '▾',
    };
  }

  return {
    active: true,
    symbol: normalizeSortDirection(direction) === SORT_DIRECTION_ASC ? '▲' : '▼',
  };
}

export function normalizeSortableWidth(width) {
  return typeof width === 'number' || typeof width === 'string' ? width : undefined;
}

export function normalizeSortableStyle(style) {
  return style && typeof style === 'object' && !Array.isArray(style) ? style : undefined;
}

export function normalizeTableSpan(value) {
  if (value == null) return undefined;

  const span = Number(value);
  return Number.isFinite(span) ? clampInteger(span, { min: 1 }) : undefined;
}
