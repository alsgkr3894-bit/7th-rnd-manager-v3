/**
 * lib/sales/store-issues.js — menu_sales_issues 조회
 */

import { getAll, hasStore } from '../db';

/**
 * 모든 미매칭 issue 조회.
 * @param {object} opts — { status?: 'open'|'resolved'|null, year?, month? }
 */
export async function getIssues(opts = {}) {
  if (!hasStore('menu_sales_issues')) return [];
  const { status, year, month } = opts;
  const all = await getAll('menu_sales_issues');
  return all
    .filter(i => {
      if (status && i.status !== status) return false;
      if (year != null && i.year !== year) return false;
      if (month != null && i.month !== month) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return (b.totalQuantity || 0) - (a.totalQuantity || 0);
    });
}
