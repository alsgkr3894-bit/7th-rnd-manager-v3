/**
 * lib/sales/category.js — 카테고리별 판매 비중/상세 (단일 월 기준)
 */

import { STATUS_CLASSIFIED, CATEGORY_COLORS } from './_stat-helpers.js';
import { asDisplayText, asFiniteNumber, asObjectArray, clampInteger } from '../ui/prop-guards.js';

function safePeriod(period) {
  const value = period && typeof period === 'object' && !Array.isArray(period) ? period : {};
  return {
    year: asFiniteNumber(value.year, 0) ?? 0,
    month: asFiniteNumber(value.month, 0) ?? 0,
  };
}

function safeCategoryName(value) {
  return asDisplayText(value, '미분류') || '미분류';
}

function safeMenuName(row, groupBy) {
  const candidates =
    groupBy === 'group'
      ? [row.groupName, row.mappedMenuName, row.normalizedMenuName, row.rawMenuName]
      : [row.mappedMenuName, row.normalizedMenuName, row.rawMenuName];
  for (const candidate of candidates) {
    const name = asDisplayText(candidate);
    if (name) return name;
  }
  return '(미상)';
}

/**
 * 특정 월의 카테고리별 판매 비중.
 * @returns { total, items: [{ name, value, color }, ...] }
 */
export function buildCategoryShare(rows, period) {
  const safeRows = asObjectArray(rows);
  const selectedPeriod = safePeriod(period);
  const map = new Map();
  for (const r of safeRows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (
      asFiniteNumber(r.year, 0) !== selectedPeriod.year ||
      asFiniteNumber(r.month, 0) !== selectedPeriod.month
    ) {
      continue;
    }
    const cat = safeCategoryName(r.category);
    map.set(cat, (map.get(cat) || 0) + (asFiniteNumber(r.quantity, 0) ?? 0));
  }
  const items = Array.from(map, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .map((it, i) => ({ ...it, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  return { total: items.reduce((s, x) => s + x.value, 0), items };
}

/**
 * 카테고리별 상세 — 카테고리 단위 합산 + 각 카테고리의 TOP N 메뉴 포함.
 *
 * @param {Array} rows
 * @param {{year, month}} period
 * @param {object} opts — { topN: 3, groupBy: 'menu'|'group' }
 * @returns {{ total, categories: [{ name, value, color, share, topMenus: [...] }] }}
 */
export function buildCategoryDetails(rows, period, opts = {}) {
  const safeRows = asObjectArray(rows);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const topN = clampInteger(safeOpts.topN, { min: 0, max: 100, fallback: 3 });
  const groupBy = safeOpts.groupBy === 'group' ? 'group' : 'menu';
  const selectedPeriod = safePeriod(period);
  const catMap = new Map();

  for (const r of safeRows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (
      asFiniteNumber(r.year, 0) !== selectedPeriod.year ||
      asFiniteNumber(r.month, 0) !== selectedPeriod.month
    ) {
      continue;
    }
    const cat = safeCategoryName(r.category);
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, menus: new Map() });
    const entry = catMap.get(cat);
    const qty = asFiniteNumber(r.quantity, 0) ?? 0;
    entry.total += qty;

    const menuName = safeMenuName(r, groupBy);
    entry.menus.set(menuName, (entry.menus.get(menuName) || 0) + qty);
  }

  const totalAll = Array.from(catMap.values()).reduce((s, c) => s + c.total, 0);

  const categories = Array.from(catMap, ([name, entry]) => {
    const topMenus = Array.from(entry.menus, ([n, q]) => ({ name: n, quantity: q }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, topN);
    return {
      name,
      value: entry.total,
      share: totalAll > 0 ? entry.total / totalAll : 0,
      topMenus,
    };
  })
    .sort((a, b) => b.value - a.value)
    .map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  return { total: totalAll, categories };
}
