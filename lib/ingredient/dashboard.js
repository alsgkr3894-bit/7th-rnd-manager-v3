/**
 * lib/ingredient/dashboard.js — 식자재 섹션 대시보드용 요약 집계
 *
 * 식자재 리스트 페이지(app/ingredient/list/page.jsx)와 동일한 방식으로
 * 행(merged + orphan)을 만들고 KPI를 계산한다.
 * store 미존재/빈 데이터에서도 안전하게 0/null 반환.
 */

import { getPriceFiles, getPriceRowsByFileId } from '../price';
import {
  getAllIngredients,
  getIngredientMetaMap,
  mergeIngredientRows,
  buildMetaOnlyRow,
} from './index.js';

/**
 * 리스트 페이지 load()와 동일하게 표시용 행 배열 구성.
 * @returns {Promise<{rows: object[], latestPriceDate: string|null}>}
 */
async function buildRows() {
  const [files, allMeta, metaMap] = await Promise.all([
    getPriceFiles().catch(() => []),
    getAllIngredients().catch(() => []),
    getIngredientMetaMap().catch(() => new Map()),
  ]);
  const latest = files[0] || null;

  if (!latest) {
    // 가격파일 없음 → 시드/수동 항목만 표시
    const rows = allMeta.filter(m => m.isManual || m.isSeeded).map(buildMetaOnlyRow);
    return { rows, latestPriceDate: null };
  }

  const priceRows = await getPriceRowsByFileId(latest.id).catch(() => []);
  const merged = mergeIngredientRows(priceRows, metaMap).filter(r => r.hasRecord);
  const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
  const orphanRows = allMeta
    .filter(m => (m.isManual || m.isSeeded) && (!m.productCode || !priceCodeSet.has(m.productCode)))
    .map(buildMetaOnlyRow);

  return { rows: [...merged, ...orphanRows], latestPriceDate: latest.updateDate || null };
}

/**
 * @returns {Promise<{
 *   totalCount: number,        // 활성(단종·제외 아님) 식자재 수
 *   linkedCount: number,       // 제때 단가 연동 수
 *   linkPct: number,           // 연동률 %
 *   uncategorizedCount: number,// 미분류 수
 *   noBaseQtyCount: number,    // 포장수량 미설정(단가 계산 불가) 수
 *   latestPriceDate: string|null,
 * }>}
 */
export async function getIngredientDashboard() {
  const { rows, latestPriceDate } = await buildRows();
  const active = rows.filter(r => !r.discontinued && !r.excluded);
  const totalCount = active.length;
  const linkedCount = active.filter(r => r.jetteLinked).length;
  const uncategorizedCount = active.filter(r => !r.category).length;
  const noBaseQtyCount = active.filter(r => !r.baseQuantity).length;

  return {
    totalCount,
    linkedCount,
    linkPct: totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0,
    uncategorizedCount,
    noBaseQtyCount,
    latestPriceDate,
  };
}
