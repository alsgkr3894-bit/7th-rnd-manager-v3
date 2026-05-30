/**
 * 원가율(%)에 따른 색상·배경·라벨을 반환한다. (위젯·경보 표시용)
 *
 * @param {number} pct
 * @returns {{ text: string, bg: string, label: string }}
 */
export function getCostRateStyles(pct) {
  if (pct == null || pct <= 0) return { text: 'var(--text-3)',  bg: 'var(--surface-2)',      label: '—' };
  if (pct <= 30)               return { text: 'var(--positive)', bg: 'var(--positive-soft)', label: '양호' };
  if (pct <= 40)               return { text: 'var(--warn)',     bg: 'var(--warn-soft)',      label: '주의' };
  return                              { text: 'var(--negative)', bg: 'var(--negative-soft)', label: '경보' };
}

/**
 * 원가율(%) 값을 CSS 색상 변수 문자열로 반환한다.
 *  ≤ 30% → positive (초록)
 *  ≤ 40% → amber
 *  > 40%  → negative (빨강)
 *  null / 0 / 음수 → text-3 (회색)
 */
export function costRateColor(pct) {
  if (pct == null || pct <= 0) return 'var(--text-3)';
  if (pct <= 30) return 'var(--positive, #10b981)';
  if (pct <= 40) return '#f59e0b';
  return 'var(--negative, #ef4444)';
}
