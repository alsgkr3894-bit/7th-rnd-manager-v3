/**
 * lib/jette/dashboard.js — 제때(jette) 섹션 대시보드용 요약 집계
 *
 * 가격 비교(price-compare)와 출고량(shipment) 페이지의 핵심 지표를 요약한다.
 * store 미존재/빈 데이터에서도 안전하게 null/0 반환.
 */

import { getPriceFiles, getPriceRowsByFileId, comparePriceLists } from '../price';
import { buildLatestPriceLookup } from '../price/price-lookup';
import {
  getShipmentFiles,
  getShipmentRowsByFileId,
  getManagedProducts,
  aggregateShipmentRows,
} from '../shipment';
import { asDisplayText, asFiniteNumber, asObjectArray } from '../ui/prop-guards.js';

function safePeriodFromFile(file) {
  const year = asFiniteNumber(file?.year, null);
  const month = asFiniteNumber(file?.month, null);
  if (year == null || month == null || month < 1 || month > 12) return null;
  return { year: Math.floor(year), month: Math.floor(month) };
}

/**
 * 가격 비교 요약 — 최신 파일 vs 직전 파일.
 * @returns {Promise<{latestDate, totalRows, upCount, downCount, newCount}|null>}
 */
async function getPriceSummary() {
  const files = asObjectArray(await getPriceFiles().catch(() => []));
  if (!files.length) return null;

  const latest = files[0];
  const base = files[1] || null;
  let upCount = 0, downCount = 0, newCount = 0;

  if (base && latest.id != null && base.id != null) {
    const [latestRows, baseRows] = await Promise.all([
      getPriceRowsByFileId(latest.id).catch(() => []),
      getPriceRowsByFileId(base.id).catch(() => []),
    ]);
    const diff = asObjectArray(comparePriceLists(baseRows, latestRows));
    for (const r of diff) {
      const changeStatus = asDisplayText(r.changeStatus);
      if (changeStatus === '인상') upCount++;
      else if (changeStatus === '인하') downCount++;
      else if (changeStatus === '신규') newCount++;
    }
  }

  return {
    latestDate: asDisplayText(latest.updateDate) || null,
    totalRows: asFiniteNumber(latest.totalRows, 0) ?? 0,
    upCount,
    downCount,
    newCount,
  };
}

/**
 * 출고 요약 — 최신 년월 집계.
 * @returns {Promise<{year, month, rowCount, managedCount, totalAmount, typeCounts}|null>}
 */
async function getShipmentSummary() {
  const files = asObjectArray(await getShipmentFiles().catch(() => []));
  if (!files.length) return null;

  const latest = files[0];
  const latestPeriod = safePeriodFromFile(latest);
  if (!latestPeriod) return null;

  const sameMonth = files.filter(f => {
    const period = safePeriodFromFile(f);
    return period?.year === latestPeriod.year && period?.month === latestPeriod.month && f.id != null;
  });

  const rowsArrays = await Promise.all(
    sameMonth.map(f => getShipmentRowsByFileId(f.id).catch(() => []))
  );
  const allRows = rowsArrays.flatMap(rows => asObjectArray(rows));

  const [rawManaged, rawPriceLookup] = await Promise.all([
    getManagedProducts().catch(() => []),
    buildLatestPriceLookup(),
  ]);
  const managed = asObjectArray(rawManaged);
  const priceLookup = rawPriceLookup instanceof Map ? rawPriceLookup : null;

  const aggRows = asObjectArray(aggregateShipmentRows(allRows, managed, priceLookup));
  // aggRows가 이미 productType을 분류해 두므로 직접 집계 (lookup 재조회 시 미관리 품목 누락 방지)
  const typeCounts = aggRows.reduce((acc, r) => {
    const productType = asDisplayText(r.productType);
    if (productType in acc) acc[productType]++;
    return acc;
  }, { exclusive: 0, generic: 0, 'generic-managed': 0 });
  const totalAmount = aggRows.reduce((s, r) => s + (asFiniteNumber(r.totalAmount, 0) ?? 0), 0);

  return {
    year: latestPeriod.year,
    month: latestPeriod.month,
    rowCount: sameMonth.reduce((s, f) => s + (asFiniteNumber(f.totalRows, 0) ?? 0), 0),
    managedCount: managed.length,
    totalAmount,
    typeCounts,
  };
}

/**
 * @returns {Promise<{ price: object|null, shipment: object|null }>}
 */
export async function getJetteDashboard() {
  const [price, shipment] = await Promise.all([
    getPriceSummary().catch(() => null),
    getShipmentSummary().catch(() => null),
  ]);
  return { price, shipment };
}
