/**
 * lib/sales/_stat-helpers.js — sales 통계 공통 상수/헬퍼
 */

import { pickMenuName } from '../stats/_helpers';

export const STATUS_CLASSIFIED = 'classified';

export const CATEGORY_COLORS = [
  '#3182F6',
  '#10B981',
  '#F59E0B',
  '#6B3FCB',
  '#EF4444',
  '#06B6D4',
  '#B0B8C1',
  '#EC4899',
  '#14B8A6',
  '#A855F7',
  '#F97316',
];

/** classified + 해당 월 + 카테고리 필터 통과 여부 */
export function isInScope(r, period, category) {
  if (r.status !== STATUS_CLASSIFIED) return false;
  if (r.year !== period.year || r.month !== period.month) return false;
  if (!category) return true;
  if (Array.isArray(category)) return category.includes(r.category);
  return r.category === category;
}

export { pickMenuName };
