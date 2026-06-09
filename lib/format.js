/**
 * lib/format.js — 숫자/금액/비율 포매팅 + 파싱
 *
 * v2 src/common/number.js 이식.
 */

function clean(str) {
  if (str == null || str === '') return '0';
  return String(str).replace(/,/g, '').replace(/원/g, '').replace(/개/g, '').replace(/\s/g, '');
}

export function normalizeFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeFractionDigits(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(20, Math.floor(n)));
}

/** 문자열에서 금액 추출 (콤마, "원" 등 제거 후 숫자 변환) */
export function parseAmount(str) {
  return normalizeFiniteNumber(clean(str), 0);
}

/** 숫자 → "1,234" 형식 (ko-KR locale) */
export function formatNumber(n, decimals = 0) {
  const value = normalizeFiniteNumber(n, 0);
  const digits = normalizeFractionDigits(decimals, 0);
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 짧은 한국식 금액 ("1.2억", "1234만" 등). 차트 라벨 등 좁은 공간용. */
export function fmtShort(n) {
  const value = normalizeFiniteNumber(n, 0);
  if (value >= 1e8) return (value / 1e8).toFixed(1).replace(/\.0$/, '') + '억';
  if (value >= 1e4) return (value / 1e4).toFixed(0) + '만';
  return value.toLocaleString();
}

/** 숫자 두 자리 패딩 — "1" → "01". 파일명·날짜 문자열 조립에 사용. */
export const pad = n => String(n).padStart(2, '0');

/** n을 소수점 decimals 자리로 반올림한 숫자를 반환 */
export function roundTo(n, decimals = 2) {
  const value = normalizeFiniteNumber(n, 0);
  const digits = normalizeFractionDigits(decimals, 2);
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

/**
 * ISO 시각 → "방금 전" / "10분 전" / "어제" 같은 상대 표시.
 * 7일 이상 경과 시 ko-KR 날짜로 변환.
 */
export function formatRelative(iso) {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '-';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

/** { year, month } → "2026년 5월" 한국어 기간 표시 */
export function formatPeriodKor(period) {
  const year = Number(period?.year);
  const month = Number(period?.month);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return '-';
  if (year <= 0 || month < 1 || month > 12) return '-';
  return `${Math.trunc(year)}년 ${Math.trunc(month)}월`;
}

/**
 * 단위 단가를 "1,234원/g" 형식의 문자열로 변환.
 * - 1 미만: 소수점 2자리 (예: "0.85원/g")
 * - 정수:   천 단위 구분 (예: "1,234원/g")
 * - 소수:   소수점 1자리 (예: "12.5원/g")
 */
export function formatUnitPrice(price, unitType) {
  if (price == null) return null;
  const value = Number(price);
  if (!Number.isFinite(value)) return null;
  const safeUnit = unitType == null || typeof unitType === 'object' ? '' : String(unitType).trim();
  const formatted =
    value < 1 ? value.toFixed(2) : value % 1 === 0 ? formatNumber(value) : value.toFixed(1);
  return safeUnit ? `${formatted}원/${safeUnit}` : `${formatted}원`;
}

/** YYYY-MM-DD 형식 (로컬 시간대) */
export function formatDate(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 숫자 → "12.3%" 형식 비율 문자열.
 * null / NaN 이면 '-' 반환.
 *
 * @param {number|null|undefined} n        - 비율값 (100 기준, 예: 원가율)
 * @param {number}               [decimals=1] - 소수점 자리수
 * @returns {string}
 */
export function formatPercent(n, decimals = 1) {
  if (n == null) return '-';
  const value = Number(n);
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(normalizeFractionDigits(decimals, 1)) + '%';
}
