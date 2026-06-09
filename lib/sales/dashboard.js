/**
 * lib/sales/dashboard.js — 메뉴 판매량 섹션 대시보드용 요약 집계
 *
 * 기존 stats/store 조회 함수를 조합해 섹션 상위 페이지에 보여줄 KPI를 만든다.
 * store 미존재/빈 데이터에서도 안전하게 0/null/[] 반환.
 */

import { getSalesKpi, getTopMenus } from '../stats/sales-stats.js';
import { getUploadedFiles } from './store-files.js';
import { getIssues } from './store-issues.js';
import { asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';

function normalizeKpi(kpi) {
  if (!kpi || typeof kpi !== 'object' || Array.isArray(kpi)) return null;

  const current = asFiniteNumber(kpi.current, 0) ?? 0;
  const prev = asFiniteNumber(kpi.prev, 0) ?? 0;
  const deltaPct = asFiniteNumber(kpi.deltaPct, null);
  const year = asFiniteNumber(kpi.year, null);
  const month = asFiniteNumber(kpi.month, null);

  return {
    current,
    prev,
    deltaPct,
    sparkline: Array.isArray(kpi.sparkline)
      ? kpi.sparkline.map(value => asFiniteNumber(value, 0) ?? 0)
      : [],
    year,
    month,
  };
}

function normalizeRankItems(items) {
  return asObjectArray(items).map((item, index) => ({
    rank: asFiniteNumber(item.rank, index + 1) ?? index + 1,
    name: asDisplayText(item.name, '-'),
    quantity: asFiniteNumber(item.quantity, 0) ?? 0,
    spark: Array.isArray(item.spark)
      ? item.spark.map(value => asFiniteNumber(value, 0) ?? 0)
      : undefined,
  }));
}

function normalizeLatestUpload(files) {
  const latest = asObjectArray(files)[0];
  if (!latest) return null;

  return {
    ...latest,
    year: asFiniteNumber(latest.year, null),
    month: asFiniteNumber(latest.month, null),
    fileName: asDisplayText(latest.fileName),
    totalRows: asFiniteNumber(latest.totalRows, 0) ?? 0,
    uploadedAt: asDisplayText(latest.uploadedAt),
  };
}

/**
 * @returns {Promise<{
 *   kpi: {current, prev, deltaPct, sparkline, year, month}|null,
 *   best: Array<{rank, name, quantity}>,
 *   worst: Array<{rank, name, quantity}>,
 *   unmatchedCount: number,
 *   fileCount: number,
 *   latestUpload: {id, year, month, fileName, totalRows, uploadedAt}|null,
 * }>}
 */
export async function getMenuSalesDashboard() {
  const [rawKpi, rawBest, rawWorst, rawIssues, rawFiles] = await Promise.all([
    getSalesKpi().catch(() => null),
    getTopMenus(5, '피자', true, 'desc').catch(() => []),
    getTopMenus(5, '피자', true, 'asc').catch(() => []),
    getIssues({ status: 'open' }).catch(() => []),
    getUploadedFiles().catch(() => []),
  ]);

  const kpi = normalizeKpi(rawKpi);
  const best = normalizeRankItems(rawBest);
  const worst = normalizeRankItems(rawWorst);
  const issues = asObjectArray(rawIssues);
  const files = asObjectArray(rawFiles);

  // 판매 데이터가 전혀 없으면 kpi.current === 0 → null 취급
  const hasData = kpi && (kpi.current > 0 || files.length > 0);

  return {
    kpi: hasData ? kpi : null,
    best,
    worst,
    unmatchedCount: issues.length,
    fileCount: files.length,
    latestUpload: normalizeLatestUpload(files),
  };
}
