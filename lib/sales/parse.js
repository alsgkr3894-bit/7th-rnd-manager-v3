/**
 * lib/sales/parse.js — 종합 검증 진입점
 *
 * 흐름:
 *   1. parseSalesPeriod  — 판매 기간 탐지 (첫 10행)
 *   2. detectHeaderColumns — 헤더 탐지 (첫 10행 스캔)
 *   3. parseAndValidateRows — 데이터 검증
 *   4. invalidRows 있으면 success: false (모든 행 정상 정책)
 */

import { parseSalesPeriod } from './parse-period.js';
import { detectHeaderColumns } from './parse-header.js';
import { parseAndValidateRows } from './parse-rows.js';

/**
 * @param {Array<Array>} rows — 엑셀/CSV 파싱된 2차원 배열
 * @returns {
 *   success: true,
 *   period: { year, month },
 *   headerColumns: { menuColumnIndex, quantityColumnIndex },
 *   validRows: [{ rawMenuName, quantity, originalIndex }, ...],
 *   summary: { totalRows, validCount, invalidCount }
 * } 또는 {
 *   success: false, reason, invalidRows?, summary?
 * }
 */
export function validateSalesFile(rows) {
  const periodResult = parseSalesPeriod(rows);
  if (!periodResult.success) {
    return { success: false, reason: periodResult.reason };
  }

  if (rows.length < 2) {
    return { success: false, reason: '파일에 헤더 행과 데이터 행이 필요합니다.' };
  }

  // 헤더 탐지 — 첫 10행 스캔
  let headerRowIndex = -1;
  let headerResult = null;
  const scanLimit = Math.min(10, rows.length);
  for (let i = 0; i < scanLimit; i++) {
    const result = detectHeaderColumns(rows[i]);
    if (result.success) { headerRowIndex = i; headerResult = result; break; }
  }
  if (!headerResult) {
    return {
      success: false,
      reason: '필수 헤더를 찾을 수 없습니다. (허용: "메뉴명", "메뉴 명" / "판매량(개)", "판매량 (개)")',
    };
  }

  // 데이터 검증
  const dataRows = rows.slice(headerRowIndex + 1);
  const dataResult = parseAndValidateRows(
    dataRows,
    headerResult.menuColumnIndex,
    headerResult.quantityColumnIndex,
  );
  if (!dataResult.success) {
    return { success: false, reason: dataResult.reason };
  }

  // 모든 행이 정상이어야 함
  if (dataResult.invalidRows.length > 0) {
    return {
      success: false,
      reason: `${dataResult.invalidRows.length}행의 데이터 오류가 있습니다. 모든 행을 정정하고 다시 업로드해주세요.`,
      invalidRows: dataResult.invalidRows,
      summary: {
        totalRows: dataResult.totalRows,
        validCount: dataResult.validRows.length,
        invalidCount: dataResult.invalidRows.length,
      },
    };
  }

  return {
    success: true,
    period: { year: periodResult.year, month: periodResult.month },
    headerColumns: {
      menuColumnIndex: headerResult.menuColumnIndex,
      quantityColumnIndex: headerResult.quantityColumnIndex,
    },
    validRows: dataResult.validRows,
    summary: {
      totalRows: dataResult.totalRows,
      validCount: dataResult.validRows.length,
      invalidCount: 0,
    },
  };
}
