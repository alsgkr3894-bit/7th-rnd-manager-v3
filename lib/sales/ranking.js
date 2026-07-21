/**
 * lib/sales/ranking.js — 단일 월 중분류 순위 (사이즈별 detail 포함)
 */

import { STATUS_CLASSIFIED } from './_stat-helpers.js';
import { asArray, asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';
import { safeRevenue } from './revenue.js';

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
 * @returns [{ name, category, quantity, revenue, sizes: [{ size, quantity, revenue, share }] }]
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
      entry = { name: groupName, category, quantity: 0, revenue: 0, sizes: new Map() };
      map.set(key, entry);
    }
    const qty = asFiniteNumber(r.quantity, 0) ?? 0;
    const revenue = safeRevenue(r.revenue ?? r.amount ?? r.salesAmount ?? r.totalAmount);
    entry.quantity += qty;
    entry.revenue += revenue;

    const size = extractSize(r.detailName, groupName);
    const sizeEntry = entry.sizes.get(size) || { quantity: 0, revenue: 0 };
    sizeEntry.quantity += qty;
    sizeEntry.revenue += revenue;
    entry.sizes.set(size, sizeEntry);
  }

  return Array.from(map.values())
    .map(g => {
      const sizes = Array.from(g.sizes, ([size, item]) => ({
        size,
        quantity: item.quantity,
        revenue: item.revenue,
        share: g.quantity > 0 ? item.quantity / g.quantity : 0,
      })).sort((a, b) => b.quantity - a.quantity);
      return {
        name: g.name,
        category: g.category,
        quantity: g.quantity,
        revenue: g.revenue,
        sizes,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);
}

/**
 * 여러 buildGroupRanking() 결과(월별)를 그룹명+카테고리 기준으로 합산한다.
 * 분기·연 단위처럼 여러 달을 하나의 기간으로 묶어 보여줄 때 사용한다.
 * @param {Array<Array<object>>} rankingArrays
 */
export function mergeGroupRankings(rankingArrays) {
  const map = new Map();

  for (const ranking of asArray(rankingArrays)) {
    for (const g of asObjectArray(ranking)) {
      const key = `${g.name}|${g.category}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { name: g.name, category: g.category, quantity: 0, revenue: 0, sizes: new Map() };
        map.set(key, entry);
      }
      entry.quantity += asFiniteNumber(g.quantity, 0) ?? 0;
      entry.revenue += asFiniteNumber(g.revenue, 0) ?? 0;
      for (const s of asObjectArray(g.sizes)) {
        const sizeEntry = entry.sizes.get(s.size) || { quantity: 0, revenue: 0 };
        sizeEntry.quantity += asFiniteNumber(s.quantity, 0) ?? 0;
        sizeEntry.revenue += asFiniteNumber(s.revenue, 0) ?? 0;
        entry.sizes.set(s.size, sizeEntry);
      }
    }
  }

  return Array.from(map.values())
    .map(g => {
      const sizes = Array.from(g.sizes, ([size, item]) => ({
        size,
        quantity: item.quantity,
        revenue: item.revenue,
        share: g.quantity > 0 ? item.quantity / g.quantity : 0,
      })).sort((a, b) => b.quantity - a.quantity);
      return {
        name: g.name,
        category: g.category,
        quantity: g.quantity,
        revenue: g.revenue,
        sizes,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);
}
