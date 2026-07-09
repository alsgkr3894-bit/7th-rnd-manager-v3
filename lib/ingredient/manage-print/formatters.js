import { formatNumber } from '@/lib/format';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { DISCONTINUED_FILTER, SCOPE_UNASSIGNED, UNCATEGORIZED_FILTER } from '../constants';

const ALLERGEN_NAME = Object.fromEntries(
  ALLERGEN_SEED.map(({ allergenCode, allergenName }) => [allergenCode, allergenName])
);

export const esc = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function text(value, fallback = '') {
  const stringValue = String(value ?? '').trim();
  return stringValue || fallback;
}

export function rowName(row) {
  return text(row?.ingredientName || row?.displayName || row?.productName, '-');
}

export function unitLabel(row) {
  const baseQuantity = Number(row?.baseQuantity);
  const baseUnitType = text(row?.baseUnitType);
  if (Number.isFinite(baseQuantity) && baseQuantity > 0 && baseUnitType) {
    return `${formatNumber(baseQuantity)}${baseUnitType}`;
  }
  return text(row?.salesUnit, '-');
}

export function priceLabel(row) {
  const price = Number(row?.priceWithTax ?? row?.priceOverride ?? row?.price);
  return Number.isFinite(price) ? `${formatNumber(price)}원` : '-';
}

export function originLabel(row) {
  const origin = Array.isArray(row?.origin) ? row.origin : [];
  const values = origin
    .map(item => {
      const displayName = text(item?.displayName);
      const country = text(item?.country);
      if (!country) return '';
      return displayName ? `${displayName} ${country}` : country;
    })
    .filter(Boolean);
  return values.length ? values.join(', ') : '-';
}

export function allergensLabel(row) {
  const codes = Array.isArray(row?.allergens) ? row.allergens : [];
  const names = codes.map(code => ALLERGEN_NAME[code] || code).filter(Boolean);
  return names.length ? names.join(', ') : '-';
}

export function sourceLabel(row) {
  if (row?.jetteLinked) return '제때연동';
  if (row?.isSeeded) return '시드';
  return row?.isManual ? '수동' : '기타';
}

export function filterLabel(filters = {}) {
  const parts = [];
  const category = text(filters.category, 'all');
  const tag = text(filters.tag, 'all');
  const search = text(filters.search);

  if (category === DISCONTINUED_FILTER) parts.push('분류: 단종');
  else if (category === UNCATEGORIZED_FILTER) parts.push('분류: 미분류');
  else if (category && category !== 'all') parts.push(`분류: ${category}`);
  else parts.push('분류: 전체');

  if (tag && tag !== 'all') parts.push(`#${tag}`);
  if (search) parts.push(`검색: ${search}`);
  return parts.join(' · ');
}

export function scopeBadgeHtml(scope) {
  const scopeLabel = text(scope, SCOPE_UNASSIGNED);
  const className =
    scopeLabel === '전용'
      ? 'scope-jeonhyong'
      : scopeLabel === '범용'
        ? 'scope-beomyong'
        : 'scope-none';
  return `<span class="scope-badge ${className}">${esc(scopeLabel)}</span>`;
}
