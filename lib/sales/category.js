/**
 * lib/sales/category.js — 카테고리별 판매 비중/상세 (단일 월 기준)
 */

import { STATUS_CLASSIFIED, CATEGORY_COLORS, pickMenuName } from './_stat-helpers.js';

/**
 * 특정 월의 카테고리별 판매 비중.
 * @returns { total, items: [{ name, value, color }, ...] }
 */
export function buildCategoryShare(rows, period) {
  const map = new Map();
  for (const r of rows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (r.year !== period.year || r.month !== period.month) continue;
    const cat = r.category || '미분류';
    map.set(cat, (map.get(cat) || 0) + (Number(r.quantity) || 0));
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
  const { topN = 3, groupBy = 'menu' } = opts;
  const catMap = new Map();

  for (const r of rows) {
    if (r.status !== STATUS_CLASSIFIED) continue;
    if (r.year !== period.year || r.month !== period.month) continue;
    const cat = r.category || '미분류';
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, menus: new Map() });
    const entry = catMap.get(cat);
    const qty = Number(r.quantity) || 0;
    entry.total += qty;

    const menuKey = groupBy === 'group'
      ? (r.groupName || pickMenuName(r))
      : pickMenuName(r);
    entry.menus.set(menuKey, (entry.menus.get(menuKey) || 0) + qty);
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
