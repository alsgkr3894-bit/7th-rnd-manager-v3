/**
 * lib/sales/ranking.js — 단일 월 중분류 순위 (사이즈별 detail 포함)
 */

import { STATUS_CLASSIFIED } from './_stat-helpers.js';
import { asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';

/**
 * detailName에서 사이즈 라벨 추출 ('L', 'R', '피자', '변경', '기본' 등).
 * groupName을 접두어로 제거.
 */
export function extractSize(detailName, groupName) {
  const safeDetailName = asDisplayText(detailName);
  const safeGroupName = asDisplayText(groupName);
  if (!safeDetailName) return '기타';
  if (!safeGroupName) return safeDetailName;
  const rest = safeDetailName.startsWith(safeGroupName)
    ? safeDetailName.slice(safeGroupName.length).trim()
    : safeDetailName;
  if (!rest) return '기본';
  return rest;
}

/**
 * 중분류(groupName) 단위 순위 + 각 그룹의 사이즈별 detail 포함.
 *
 * @returns [{ name, category, quantity, sizes: [{ size, quantity, share }] }]
 */
export function buildGroupRanking(rows, period) {
  const safeRows = asObjectArray(rows);
  const safePeriod =
    period && typeof period === 'object' && !Array.isArray(period)
      ? {
          year: asFiniteNumber(period.year, 0) ?? 0,
          month: asFiniteNumber(period.month, 0) ?? 0,
        }
      : { year: 0, month: 0 };
  const map = new Map();

  for (const r of safeRows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (
      asFiniteNumber(r.year, 0) !== safePeriod.year ||
      asFiniteNumber(r.month, 0) !== safePeriod.month
    ) {
      continue;
    }
    const groupName =
      asDisplayText(r.groupName) ||
      asDisplayText(r.mappedMenuName) ||
      asDisplayText(r.normalizedMenuName) ||
      asDisplayText(r.rawMenuName) ||
      '(미상)';
    const category = asDisplayText(r.category, '미분류') || '미분류';
    const key = `${groupName}|${category}`;

    let entry = map.get(key);
    if (!entry) {
      entry = { name: groupName, category, quantity: 0, sizes: new Map() };
      map.set(key, entry);
    }
    const qty = asFiniteNumber(r.quantity, 0) ?? 0;
    entry.quantity += qty;

    const size = extractSize(r.detailName, groupName);
    entry.sizes.set(size, (entry.sizes.get(size) || 0) + qty);
  }

  return Array.from(map.values())
    .map(g => {
      const sizes = Array.from(g.sizes, ([size, quantity]) => ({
        size,
        quantity,
        share: g.quantity > 0 ? quantity / g.quantity : 0,
      })).sort((a, b) => b.quantity - a.quantity);
      return { name: g.name, category: g.category, quantity: g.quantity, sizes };
    })
    .sort((a, b) => b.quantity - a.quantity);
}
