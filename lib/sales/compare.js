/**
 * lib/sales/compare.js — 두 기간 판매량 비교 (순수 함수)
 *
 * 기준 (A) vs 비교 (B):
 *   - classified 행만 합산
 *   - groupBy: 'menu' (mappedMenuName 단위) | 'group' (groupName 중분류)
 *   - 한쪽만 있는 메뉴는 신규(B=0) / 단종(A=0)
 *
 * 출력:
 *   { periodA, periodB, totalA, totalB, totalDiff, totalPct,
 *     rows, newMenus, droppedMenus, topRise, topFall }
 */

import { STATUS_CLASSIFIED, pickMenuName } from './_stat-helpers.js';

/**
 * @param {Array} rows
 * @param {{year, month}} periodA
 * @param {{year, month}} periodB
 * @param {object} opts — { groupBy: 'menu'|'group', category?: string|string[]|null, topN: number }
 */
export function buildPeriodCompare(rows, periodA, periodB, opts = {}) {
  const { groupBy = 'menu', category = null, topN = 3 } = opts;

  const inCategory = (r) => {
    if (!category) return true;
    if (Array.isArray(category)) return category.includes(r.category);
    return r.category === category;
  };
  const inA = (r) => r.year === periodA.year && r.month === periodA.month;
  const inB = (r) => r.year === periodB.year && r.month === periodB.month;
  const keyOf = (r) => groupBy === 'group'
    ? (r.groupName || pickMenuName(r))
    : pickMenuName(r);

  const map = new Map();
  for (const r of rows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (!inCategory(r)) continue;
    const isA = inA(r), isB = inB(r);
    if (!isA && !isB) continue;
    const k = keyOf(r);
    let entry = map.get(k);
    if (!entry) {
      entry = { name: k, category: r.category || '', a: 0, b: 0 };
      map.set(k, entry);
    }
    const qty = Number(r.quantity) || 0;
    if (isA) entry.a += qty;
    if (isB) entry.b += qty;
  }

  const items = Array.from(map.values()).map(it => {
    const diff = it.a - it.b;
    const pct = it.b === 0 ? null : ((it.a - it.b) / it.b) * 100;
    return { ...it, diff, pct, aIsZero: it.a === 0, bIsZero: it.b === 0 };
  });

  const totalA = items.reduce((s, r) => s + r.a, 0);
  const totalB = items.reduce((s, r) => s + r.b, 0);
  const totalDiff = totalA - totalB;
  const totalPct = totalB === 0 ? null : (totalDiff / totalB) * 100;

  const newMenus     = items.filter(r => r.bIsZero && !r.aIsZero);
  const droppedMenus = items.filter(r => r.aIsZero && !r.bIsZero);
  const both = items.filter(r => !r.aIsZero && !r.bIsZero);

  const topRise = [...both].sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity)).slice(0, topN);
  const topFall = [...both].sort((a, b) => (a.pct ?? Infinity)  - (b.pct ?? Infinity)).slice(0, topN);

  return {
    periodA, periodB,
    totalA, totalB, totalDiff, totalPct,
    rows: items, newMenus, droppedMenus, topRise, topFall,
  };
}

/** 기준 기간에서 비교 기간 자동 계산. */
export function deriveCompareB(a, mode) {
  if (mode === 'yoy') return { year: a.year - 1, month: a.month };
  if (mode === 'mom') {
    const d = new Date(a.year, a.month - 2, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return a;
}
