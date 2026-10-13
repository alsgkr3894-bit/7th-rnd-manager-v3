import { MENU_CATEGORY } from '@/lib/menu-categories';

export const CAT_COLORS = {
  피자: { bg: 'var(--cat-1-bg)', color: 'var(--cat-1-text)' },
  '1인피자': { bg: 'var(--cat-3-bg)', color: 'var(--cat-3-text)' },
  사이드: { bg: 'var(--cat-2-bg)', color: 'var(--cat-2-text)' },
  세트박스: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  기타: { bg: 'var(--surface-2)', color: 'var(--text-3)' },
};

// 피자·사이드 메뉴만 다룬다(세트·기타·엣지·추가토핑은 사용현황에서 뺀다 — 2026-10-13)
export const USAGE_CATS = ['전체', MENU_CATEGORY.PIZZA, MENU_CATEGORY.SIDE, MENU_CATEGORY.PERSONAL];

export const USAGE_THRESHOLD = { HIGH: 8, MID: 4 };
export const TIER_LABEL = ['많이 쓰는 재료 (8개 이상)', '보통 (4–7개)', '적게 쓰는 재료 (1–3개)'];

export const tierOf = count =>
  count >= USAGE_THRESHOLD.HIGH ? 0 : count >= USAGE_THRESHOLD.MID ? 1 : 2;

export const keyOf = row => row.code || row.name;

export function usageCountStyle(count) {
  if (count >= USAGE_THRESHOLD.HIGH)
    return { background: 'var(--cat-1-bg)', color: 'var(--cat-1-text)' };
  if (count >= USAGE_THRESHOLD.MID)
    return { background: 'var(--cat-2-bg)', color: 'var(--cat-2-text)' };
  if (count === 1) return { background: 'var(--warn-soft)', color: 'var(--warn)' };
  return { background: 'var(--surface-2)', color: 'var(--text-2)' };
}
