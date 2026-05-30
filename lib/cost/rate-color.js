import { COST_RATE_THRESHOLD } from '@/lib/cost/margin/constants';

/**
 * 원가율(%)에 따른 색상·배경·라벨을 반환한다. (위젯·경보 표시용)
 *
 * @param {number} pct
 * @returns {{ text: string, bg: string, label: string }}
 */
export function getCostRateStyles(pct) {
  if (pct == null || pct <= 0)              return { text: 'var(--text-3)',   bg: 'var(--surface-2)',      label: '—' };
  if (pct <= COST_RATE_THRESHOLD.GOOD)      return { text: 'var(--positive)', bg: 'var(--positive-soft)', label: '양호' };
  if (pct <= COST_RATE_THRESHOLD.WARNING)   return { text: 'var(--warn)',     bg: 'var(--warn-soft)',      label: '주의' };
  return                                           { text: 'var(--negative)', bg: 'var(--negative-soft)', label: '경보' };
}

/**
 * 원가율(%) 값을 CSS 색상 변수 문자열로 반환한다.
 *  ≤ GOOD(30)%    → positive (초록)
 *  ≤ WARNING(40)% → amber
 *  > WARNING(40)% → negative (빨강)
 *  null / 0 / 음수 → text-3 (회색)
 */
export function costRateColor(pct) {
  if (pct == null || pct <= 0)            return 'var(--text-3)';
  if (pct <= COST_RATE_THRESHOLD.GOOD)    return 'var(--positive, #10b981)';
  if (pct <= COST_RATE_THRESHOLD.WARNING) return '#f59e0b';
  return 'var(--negative, #ef4444)';
}
