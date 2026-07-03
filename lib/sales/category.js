/**
 * lib/sales/category.js — 카테고리별 판매 비중/상세 (단일 월 기준)
 */

import { STATUS_CLASSIFIED, CATEGORY_COLORS } from './_stat-helpers.js';
import { asDisplayText, asFiniteNumber, asObjectArray, clampInteger } from '../ui/prop-guards.js';
import { safeRevenue } from './revenue.js';

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
 * @returns { total, revenueTotal, items: [{ name, value, revenue, color }, ...] }
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
    const entry = map.get(cat) || { value: 0, revenue: 0 };
    entry.value += asFiniteNumber(r.quantity, 0) ?? 0;
    entry.revenue += safeRevenue(r.revenue ?? r.amount ?? r.salesAmount ?? r.totalAmount);
    map.set(cat, entry);
  }
  const items = Array.from(map, ([name, entry]) => ({ name, ...entry }))
    .sort((a, b) => b.value - a.value)
    .map((it, i) => ({ ...it, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  return {
    total: items.reduce((s, x) => s + x.value, 0),
    revenueTotal: items.reduce((s, x) => s + x.revenue, 0),
    items,
  };
}

/**
 * 카테고리별 상세 — 카테고리 단위 합산 + 각 카테고리의 TOP N 메뉴 포함.
 *
 * @param {Array} rows
 * @param {{year, month}} period
 * @param {object} opts — { topN: 3, groupBy: 'menu'|'group' }
 * @returns {{ total, revenueTotal, categories: [{ name, value, revenue, color, share, topMenus: [...] }] }}
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
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, revenue: 0, menus: new Map() });
    const entry = catMap.get(cat);
    const qty = asFiniteNumber(r.quantity, 0) ?? 0;
    const revenue = safeRevenue(r.revenue ?? r.amount ?? r.salesAmount ?? r.totalAmount);
    entry.total += qty;
    entry.revenue += revenue;

    const menuName = safeMenuName(r, groupBy);
    const menuEntry = entry.menus.get(menuName) || { quantity: 0, revenue: 0 };
    menuEntry.quantity += qty;
    menuEntry.revenue += revenue;
    entry.menus.set(menuName, menuEntry);
  }

  const totalAll = Array.from(catMap.values()).reduce((s, c) => s + c.total, 0);
  const revenueTotal = Array.from(catMap.values()).reduce((s, c) => s + c.revenue, 0);

  const categories = Array.from(catMap, ([name, entry]) => {
    const topMenus = Array.from(entry.menus, ([n, menu]) => ({
      name: n,
      quantity: menu.quantity,
      revenue: menu.revenue,
    }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, topN);
    return {
      name,
      value: entry.total,
      revenue: entry.revenue,
      share: totalAll > 0 ? entry.total / totalAll : 0,
      topMenus,
    };
  })
    .sort((a, b) => b.value - a.value)
    .map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  return { total: totalAll, revenueTotal, categories };
}
