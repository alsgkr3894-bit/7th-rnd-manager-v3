/**
 * lib/sales/store-issues.js — menu_sales_issues 조회
 */

import { getAll, hasStore } from '../db';
import { asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';

const ISSUE_STATUSES = new Set(['open', 'resolved']);

function safeFilterNumber(value) {
  return value == null ? null : asFiniteNumber(value, null);
}

/**
 * 모든 미매칭 issue 조회.
 * @param {object} opts — { status?: 'open'|'resolved'|null, year?, month? }
 */
export async function getIssues(opts = {}) {
  if (!hasStore('menu_sales_issues')) return [];
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  const requestedStatus = asDisplayText(safeOpts.status);
  const status = ISSUE_STATUSES.has(requestedStatus) ? requestedStatus : null;
  const year = safeFilterNumber(safeOpts.year);
  const month = safeFilterNumber(safeOpts.month);
  const all = asObjectArray(await getAll('menu_sales_issues'));

  return all
    .filter(i => {
      if (status && asDisplayText(i.status) !== status) return false;
      if (year != null && asFiniteNumber(i.year, null) !== year) return false;
      if (month != null && asFiniteNumber(i.month, null) !== month) return false;
      return true;
    })
    .sort((a, b) => {
      const yearA = asFiniteNumber(a.year, 0) ?? 0;
      const yearB = asFiniteNumber(b.year, 0) ?? 0;
      const monthA = asFiniteNumber(a.month, 0) ?? 0;
      const monthB = asFiniteNumber(b.month, 0) ?? 0;
      if (yearA !== yearB) return yearB - yearA;
      if (monthA !== monthB) return monthB - monthA;
      return (asFiniteNumber(b.totalQuantity, 0) ?? 0) - (asFiniteNumber(a.totalQuantity, 0) ?? 0);
    });
}
