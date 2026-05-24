/**
 * lib/format.js — 숫자/금액/비율 포매팅 + 파싱
 *
 * v2 src/common/number.js 이식.
 */

function clean(str) {
  if (str == null || str === '') return '0';
  return String(str)
    .replace(/,/g, '')
    .replace(/원/g, '')
    .replace(/개/g, '')
    .replace(/\s/g, '');
}

/** 문자열에서 금액 추출 (콤마, "원" 등 제거 후 숫자 변환) */
export function parseAmount(str) {
  const n = Number(clean(str));
  return isNaN(n) ? 0 : n;
}

/** 문자열에서 수량 추출 */
export function parseQuantity(str) {
  const n = Number(clean(str));
  return isNaN(n) ? 0 : n;
}

/** 빈 값 → 0, 그 외는 숫자 변환 */
export function emptyToZero(value) {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

/** 숫자 → "1,234" 형식 (ko-KR locale) */
export function formatNumber(n, decimals = 0) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 금액 → "1,234원" */
export function formatWon(n) {
  if (n == null || isNaN(n)) return '-';
  return formatNumber(n) + '원';
}

/**
 * 비율(소수) → "+2.50%" 형식.
 * @param {number|null} ratio  0.025 같은 소수
 * @param {number} decimals    소수점 자리수 (기본 2)
 */
export function formatPercent(ratio, decimals = 2) {
  if (ratio == null || isNaN(Number(ratio))) return '-';
  const pct = Number(ratio) * 100;
  return (pct > 0 ? '+' : '') + pct.toFixed(decimals) + '%';
}

/** 짧은 한국식 금액 ("1.2억", "1234만" 등). 차트 라벨 등 좁은 공간용. */
export function fmtShort(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만';
  return Number(n).toLocaleString();
}

/** fmtKRW = formatNumber 별칭 (디자인 파일 호환) */
export const fmtKRW = formatNumber;

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
