/**
 * lib/sales/fill-revenue.js — 이미 올린 달에 매출액만 채우기 (순수 함수)
 *
 * 금액 칸('매출액 (원)')을 알아보지 못하던 때 올린 달은 sales_rows의 revenue가 전부 0이다.
 * 같은 엑셀을 다시 올리면 분류·수량은 그대로 두고 revenue만 채운다.
 *
 * 다른 달·수정된 파일을 잘못 넣는 일을 막으려고 행 수·메뉴명·판매량이 순서대로
 * 전부 같을 때만 채운다. 예전 업로드와 지금 파서는 originalIndex 시작 번호가 달라
 * (예전 2부터, 지금은 헤더 위치 기준) 번호 자체가 아니라 순서로 맞춘다.
 */

import { isComboVirtualRow } from './classify.js';
import { safeRevenue } from './revenue.js';

const MISMATCH_SAMPLE_LIMIT = 5;

const byOriginalIndex = (a, b) => (Number(a.originalIndex) || 0) - (Number(b.originalIndex) || 0);
const nameOf = row => String(row?.rawMenuName ?? '').trim();

/**
 * 그 달 파일에 매출액이 비어 있고, 새로 올린 파일에는 금액 칸이 있을 때만 채우기를 제안한다.
 * @param {object|null} fileMeta - sales_files 레코드
 * @param {object} revenueSummary - validateSalesFile 결과의 revenueSummary
 */
export function canFillRevenue(fileMeta, revenueSummary) {
  if (!fileMeta || typeof fileMeta !== 'object') return false;
  if (revenueSummary?.hasRevenueColumn !== true) return false;
  if (fileMeta.hasRevenueColumn === true) return false;
  return safeRevenue(fileMeta.totalRevenue) === 0;
}

/**
 * @param {Array} storedRows - 그 달 sales_rows (id 포함, 콤보 가상 행 포함 가능)
 * @param {Array} validRows - 새 파일의 validRows ({ rawMenuName, quantity, revenue, originalIndex })
 * @returns {{ ok: true, updates: {id, revenue}[], totalRevenue: number }
 *   | { ok: false, reason: string, mismatches: object[], mismatchCount: number }}
 */
export function planRevenueFill(storedRows, validRows) {
  const stored = (Array.isArray(storedRows) ? storedRows : [])
    .filter(row => row && typeof row === 'object' && !isComboVirtualRow(row))
    .sort(byOriginalIndex);
  const incoming = (Array.isArray(validRows) ? validRows : [])
    .filter(row => row && typeof row === 'object')
    .sort(byOriginalIndex);

  if (stored.length !== incoming.length) {
    return {
      ok: false,
      reason: `행 수가 다릅니다 (기존 ${stored.length}행 · 새 파일 ${incoming.length}행)`,
      mismatches: [],
      mismatchCount: 0,
    };
  }

  const mismatches = [];
  const updates = [];
  let totalRevenue = 0;
  stored.forEach((row, i) => {
    const next = incoming[i];
    if (nameOf(row) !== nameOf(next) || Number(row.quantity) !== Number(next.quantity)) {
      mismatches.push({
        position: i + 1,
        storedName: nameOf(row),
        storedQuantity: Number(row.quantity),
        fileName: nameOf(next),
        fileQuantity: Number(next.quantity),
      });
      return;
    }
    const revenue = safeRevenue(next.revenue);
    totalRevenue += revenue;
    updates.push({ id: row.id, revenue });
  });

  if (mismatches.length > 0) {
    return {
      ok: false,
      reason: `${mismatches.length}행의 메뉴명·판매량이 기존 데이터와 다릅니다`,
      mismatches: mismatches.slice(0, MISMATCH_SAMPLE_LIMIT),
      mismatchCount: mismatches.length,
    };
  }
  return { ok: true, updates, totalRevenue };
}
