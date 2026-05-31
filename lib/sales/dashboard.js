/**
 * lib/sales/dashboard.js — 메뉴 판매량 섹션 대시보드용 요약 집계
 *
 * 기존 stats/store 조회 함수를 조합해 섹션 상위 페이지에 보여줄 KPI를 만든다.
 * store 미존재/빈 데이터에서도 안전하게 0/null/[] 반환.
 */

import { getSalesKpi, getTopMenus } from '../stats/sales-stats.js';
import { getUploadedFiles } from './store-files.js';
import { getIssues } from './store-issues.js';

/**
 * @returns {Promise<{
 *   kpi: {current, prev, deltaPct, year, month}|null,
 *   best: Array<{rank, name, quantity}>,
 *   worst: Array<{rank, name, quantity}>,
 *   unmatchedCount: number,
 *   fileCount: number,
 *   latestUpload: {year, month, fileName, totalRows}|null,
 * }>}
 */
export async function getMenuSalesDashboard() {
  const [kpi, best, worst, issues, files] = await Promise.all([
    getSalesKpi().catch(() => null),
    getTopMenus(5, '피자', true, 'desc').catch(() => []),
    getTopMenus(5, '피자', true, 'asc').catch(() => []),
    getIssues({ status: 'open' }).catch(() => []),
    getUploadedFiles().catch(() => []),
  ]);

  // 판매 데이터가 전혀 없으면 kpi.current === 0 → null 취급
  const hasData = kpi && (kpi.current > 0 || files.length > 0);

  return {
    kpi: hasData ? kpi : null,
    best,
    worst,
    unmatchedCount: issues.length,
    fileCount: files.length,
    latestUpload: files[0] || null,
  };
}
