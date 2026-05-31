/**
 * lib/jette/dashboard.js — 제때(jette) 섹션 대시보드용 요약 집계
 *
 * 가격 비교(price-compare)와 출고량(shipment) 페이지의 핵심 지표를 요약한다.
 * store 미존재/빈 데이터에서도 안전하게 null/0 반환.
 */

import { getPriceFiles, getPriceRowsByFileId, comparePriceLists } from '../price';
import {
  getShipmentFiles,
  getShipmentRowsByFileId,
  getManagedProducts,
  aggregateShipmentRows,
} from '../shipment';
import { getProductTypeCounts } from './utils.js';

/** 최신 가격파일의 productCode → priceWithTax 맵 (출고 단가 조회용) */
async function buildLatestPriceLookup() {
  try {
    const files = await getPriceFiles();
    if (!files.length) return new Map();
    const rows = await getPriceRowsByFileId(files[0].id);
    const map = new Map();
    for (const r of rows) {
      if (r.productCode && r.priceWithTax != null) map.set(r.productCode, r.priceWithTax);
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * 가격 비교 요약 — 최신 파일 vs 직전 파일.
 * @returns {Promise<{latestDate, totalRows, upCount, downCount, newCount}|null>}
 */
async function getPriceSummary() {
  const files = await getPriceFiles().catch(() => []);
  if (!files.length) return null;

  const latest = files[0];
  const base = files[1] || null;
  let upCount = 0, downCount = 0, newCount = 0;

  if (base) {
    const [latestRows, baseRows] = await Promise.all([
      getPriceRowsByFileId(latest.id).catch(() => []),
      getPriceRowsByFileId(base.id).catch(() => []),
    ]);
    const diff = comparePriceLists(baseRows, latestRows);
    for (const r of diff) {
      if (r.changeStatus === '인상') upCount++;
      else if (r.changeStatus === '인하') downCount++;
      else if (r.changeStatus === '신규') newCount++;
    }
  }

  return {
    latestDate: latest.updateDate || null,
    totalRows: latest.totalRows ?? 0,
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
  const files = await getShipmentFiles().catch(() => []);
  if (!files.length) return null;

  const latest = files[0];
  const sameMonth = files.filter(f => f.year === latest.year && f.month === latest.month);

  const rowsArrays = await Promise.all(
    sameMonth.map(f => getShipmentRowsByFileId(f.id).catch(() => []))
  );
  const allRows = rowsArrays.flat();

  const [managed, priceLookup] = await Promise.all([
    getManagedProducts().catch(() => []),
    buildLatestPriceLookup(),
  ]);

  const aggRows = aggregateShipmentRows(allRows, managed, priceLookup);
  const typeLookup = new Map(managed.filter(p => p.productCode).map(p => [p.productCode, p]));
  const typeCounts = getProductTypeCounts(aggRows, typeLookup);
  const totalAmount = aggRows.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return {
    year: latest.year,
    month: latest.month,
    rowCount: sameMonth.reduce((s, f) => s + (f.totalRows || 0), 0),
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
