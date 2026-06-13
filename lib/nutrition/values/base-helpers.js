// 베이스 영양성분(TabBase) 공용 순수 헬퍼.
import { asDisplayText } from '@/lib/ui/prop-guards';
export { EMPTY_RECORD as EMPTY_MAP, asRecord, noop } from '@/lib/ui/prop-guards';
import { CRUST_TYPES } from '@/lib/nutrition/values/store';

export function normalizeIngredientName(row) {
  return asDisplayText(
    row?.ingredientName || row?.displayName || row?.productName || row?.productCode
  );
}

export function getCrustSize(crustType) {
  return asDisplayText(crustType).endsWith('R') ? 'R' : 'L';
}

export function getCrustPair(crustType) {
  const current = asDisplayText(crustType, '석쇠L');
  const family = current.replace(/[LR]$/, '') || '석쇠';
  const pair = { L: `${family}L`, R: `${family}R` };
  return {
    L: CRUST_TYPES.includes(pair.L) ? pair.L : null,
    R: CRUST_TYPES.includes(pair.R) ? pair.R : null,
  };
}

export function formatCrustPairLabel(pair) {
  return ['L', 'R']
    .map(size => pair?.[size])
    .filter(Boolean)
    .join('/');
}

export function formatCalcValue(value, suffix = '') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString('ko-KR')}${suffix}`;
}
