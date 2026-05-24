/**
 * lib/stats/_helpers.js — 통계 계산 공통 헬퍼
 */

import { getAll, hasStore } from '../db';

/** 현재 년월 */
export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** N개월 전 년월 (음수 = 과거, 양수 = 미래) */
export function shiftMonth(year, month, deltaMonths) {
  const d = new Date(year, month - 1 + deltaMonths, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** "5월" 같은 짧은 라벨 */
export function monthLabel(month) {
  return `${month}월`;
}

/** store 안전 조회 — 미존재/오류 시 빈 배열 */
export async function safeAll(storeName) {
  if (!hasStore(storeName)) return [];
  try { return await getAll(storeName); } catch { return []; }
}

/** sales_rows 표준 메뉴명 추출 (mapped → normalized → raw) */
export function pickMenuName(row) {
  return row.mappedMenuName || row.normalizedMenuName || row.rawMenuName || '(미상)';
}
