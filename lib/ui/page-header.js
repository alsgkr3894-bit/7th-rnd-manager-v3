import { asArray, asDisplayText, asObjectArray } from './prop-guards';

export function normalizePageText(value, fallback = '') {
  return asDisplayText(value, fallback);
}

export function normalizeBreadcrumbs(breadcrumb) {
  return asArray(breadcrumb)
    .map(item => {
      const label = asDisplayText(typeof item === 'string' ? item : item?.label);
      if (!label) return null;

      const href = item && typeof item === 'object' && typeof item.href === 'string'
        ? item.href
        : null;

      return { label, href };
    })
    .filter(Boolean);
}

export function normalizeFilterChips(chips) {
  return asObjectArray(chips)
    .map(chip => {
      const label = asDisplayText(chip.label);
      const count = asDisplayText(chip.count);

      if (!label && !count) return null;

      return {
        label,
        count,
        active: Boolean(chip.active),
        onClick: typeof chip.onClick === 'function' ? chip.onClick : undefined,
      };
    })
    .filter(Boolean);
}

export function getBreadcrumbKey(item, index) {
  return `${item.label || 'breadcrumb'}-${index}`;
}

export function getFilterChipKey(item, index) {
  return `${item.label || 'chip'}-${index}`;
}
