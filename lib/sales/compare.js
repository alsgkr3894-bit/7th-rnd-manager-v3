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

import { STATUS_CLASSIFIED } from './_stat-helpers.js';
import {
  asDisplayText,
  asFiniteNumber,
  asObjectArray,
  asStringArray,
  clampInteger,
} from '../ui/prop-guards.js';

function safePeriod(period) {
  const value = period && typeof period === 'object' && !Array.isArray(period) ? period : {};
  return {
    year: clampInteger(value.year, { min: 0, fallback: 0 }),
    month: clampInteger(value.month, { min: 0, fallback: 0 }),
  };
}

function safeCategory(value) {
  return asDisplayText(value);
}

function safeMenuName(row, groupBy) {
  const candidates = groupBy === 'group'
    ? [row.groupName, row.mappedMenuName, row.normalizedMenuName, row.rawMenuName]
    : [row.mappedMenuName, row.normalizedMenuName, row.rawMenuName];
  for (const candidate of candidates) {
    const name = asDisplayText(candidate);
    if (name) return name;
  }
  return '(미상)';
}

/**
 * @param {Array} rows
 * @param {{year, month}} periodA
 * @param {{year, month}} periodB
 * @param {object} opts — { groupBy: 'menu'|'group', category?: string|string[]|null, topN: number }
 */
export function buildPeriodCompare(rows, periodA, periodB, opts = {}) {
  const safeRows = asObjectArray(rows);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const groupBy = safeOpts.groupBy === 'group' ? 'group' : 'menu';
  const categoryList = Array.isArray(safeOpts.category) ? asStringArray(safeOpts.category) : null;
  const category = categoryList
    ? categoryList.length > 0 ? categoryList : null
    : asDisplayText(safeOpts.category) || null;
  const topN = clampInteger(safeOpts.topN, { min: 0, max: 100, fallback: 3 });
  const safePeriodA = safePeriod(periodA);
  const safePeriodB = safePeriod(periodB);

  const inCategory = (r) => {
    if (!category) return true;
    const rowCategory = safeCategory(r.category);
    if (Array.isArray(category)) return category.includes(rowCategory);
    return rowCategory === category;
  };
  const inA = (r) =>
    asFiniteNumber(r.year, 0) === safePeriodA.year &&
    asFiniteNumber(r.month, 0) === safePeriodA.month;
  const inB = (r) =>
    asFiniteNumber(r.year, 0) === safePeriodB.year &&
    asFiniteNumber(r.month, 0) === safePeriodB.month;
  const keyOf = (r) => safeMenuName(r, groupBy);

  const map = new Map();
  for (const r of safeRows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (!inCategory(r)) continue;
    const isA = inA(r), isB = inB(r);
    if (!isA && !isB) continue;
    const k = keyOf(r);
    let entry = map.get(k);
    if (!entry) {
      entry = { name: k, category: safeCategory(r.category), a: 0, b: 0 };
      map.set(k, entry);
    }
    const qty = asFiniteNumber(r.quantity, 0) ?? 0;
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
    periodA: safePeriodA, periodB: safePeriodB,
    totalA, totalB, totalDiff, totalPct,
    rows: items, newMenus, droppedMenus, topRise, topFall,
  };
}

/** 기준 기간에서 비교 기간 자동 계산. */
export function deriveCompareB(a, mode) {
  const safeA = safePeriod(a);
  if (mode === 'yoy') return { year: safeA.year - 1, month: safeA.month };
  if (mode === 'mom') {
    const d = new Date(safeA.year, safeA.month - 2, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return safeA;
}
