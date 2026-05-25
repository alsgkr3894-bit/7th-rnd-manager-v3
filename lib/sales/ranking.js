/**
 * lib/sales/ranking.js — 단일 월 중분류 순위 (사이즈별 detail 포함)
 */

import { STATUS_CLASSIFIED } from './_stat-helpers.js';

/**
 * detailName에서 사이즈 라벨 추출 ('L', 'R', '피자', '변경', '기본' 등).
 * groupName을 접두어로 제거.
 */
export function extractSize(detailName, groupName) {
  if (!detailName) return '기타';
  if (!groupName) return detailName;
  const rest = detailName.startsWith(groupName)
    ? detailName.slice(groupName.length).trim()
    : detailName;
  if (!rest) return '기본';
  return rest;
}

/**
 * 중분류(groupName) 단위 순위 + 각 그룹의 사이즈별 detail 포함.
 *
 * @returns [{ name, category, quantity, sizes: [{ size, quantity, share }] }]
 */
export function buildGroupRanking(rows, period) {
  const map = new Map();

  for (const r of rows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (r.year !== period.year || r.month !== period.month) continue;
    const groupName = r.groupName || r.mappedMenuName || r.normalizedMenuName || r.rawMenuName || '(미상)';
    const key = `${groupName}|${r.category || ''}`;

    let entry = map.get(key);
    if (!entry) {
      entry = { name: groupName, category: r.category || '미분류', quantity: 0, sizes: new Map() };
      map.set(key, entry);
    }
    const qty = Number(r.quantity) || 0;
    entry.quantity += qty;

    const size = extractSize(r.detailName, groupName);
    entry.sizes.set(size, (entry.sizes.get(size) || 0) + qty);
  }

  return Array.from(map.values()).map(g => {
    const sizes = Array.from(g.sizes, ([size, quantity]) => ({
      size, quantity,
      share: g.quantity > 0 ? quantity / g.quantity : 0,
    })).sort((a, b) => b.quantity - a.quantity);
    return { name: g.name, category: g.category, quantity: g.quantity, sizes };
  }).sort((a, b) => b.quantity - a.quantity);
}
