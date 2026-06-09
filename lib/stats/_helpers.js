/**
 * lib/stats/_helpers.js — 통계 계산 공통 헬퍼
 */

import { getAll, hasStore } from '../db';
import { asDisplayText } from '../ui/prop-guards';

/** 현재 년월 */
export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function normalizeYearMonth(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const year = Number(row.year);
  const month = Number(row.month);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (year <= 0 || month < 1 || month > 12) return null;
  return { year: Math.trunc(year), month: Math.trunc(month) };
}

/**
 * rows에서 가장 최신 year/month 추출.
 * rows가 비어있으면 현재 년월 반환 (빈 DB fallback).
 */
export function pickLatestYearMonth(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return currentYearMonth();
  let bestY = 0,
    bestM = 0;
  for (const r of rows) {
    const period = normalizeYearMonth(r);
    if (!period) continue;
    const { year: y, month: m } = period;
    if (y > bestY || (y === bestY && m > bestM)) {
      bestY = y;
      bestM = m;
    }
  }
  if (bestY === 0) return currentYearMonth();
  return { year: bestY, month: bestM };
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

export function asObjectRows(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(row => row && typeof row === 'object' && !Array.isArray(row));
}

/** store 안전 조회 — 미존재/오류 시 빈 배열 */
export async function safeAll(storeName) {
  if (!hasStore(storeName)) return [];
  try {
    return asObjectRows(await getAll(storeName));
  } catch {
    return [];
  }
}

/** sales_rows 표준 메뉴명 추출 (mapped → normalized → raw) */
export function pickMenuName(row) {
  const candidates = [row?.mappedMenuName, row?.normalizedMenuName, row?.rawMenuName];
  for (const candidate of candidates) {
    const name = asDisplayText(candidate);
    if (name) return name;
  }
  return '(미상)';
}

/**
 * 최근 7개월 스파크라인 배열 생성 (인덱스 0 = 6개월 전, 6 = 이번 달).
 * @param {number} year  기준 연도
 * @param {number} month 기준 월 (1-indexed)
 * @param {function} valueForMonth (year, month) → number 콜백
 */
export function buildSparkline(year, month, valueForMonth) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const p = shiftMonth(year, month, -i);
    result.push(valueForMonth(p.year, p.month));
  }
  return result;
}

/**
 * ISO 날짜 문자열 또는 timestamp를 받아 해당 월에 속하는지 반환.
 * @param {string} isoDate  createdAt 등 ISO 문자열
 * @param {number} year     1-indexed
 * @param {number} month    1-indexed
 */
export function isInMonth(isoDate, year, month) {
  if (!isoDate) return false;
  const ts = new Date(isoDate).getTime();
  const from = new Date(year, month - 1, 1).getTime();
  const to = new Date(year, month, 1).getTime();
  return ts >= from && ts < to;
}
