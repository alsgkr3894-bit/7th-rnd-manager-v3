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


/** 숫자 → "1,234" 형식 (ko-KR locale) */
export function formatNumber(n, decimals = 0) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
  if (!period?.year || !period?.month) return '-';
  return `${period.year}년 ${period.month}월`;
}

/**
 * 단위 단가를 "1,234원/g" 형식의 문자열로 변환.
 * - 1 미만: 소수점 2자리 (예: "0.85원/g")
 * - 정수:   천 단위 구분 (예: "1,234원/g")
 * - 소수:   소수점 1자리 (예: "12.5원/g")
 */
export function formatUnitPrice(price, unitType) {
  if (price == null) return null;
  const formatted = price < 1
    ? price.toFixed(2)
    : price % 1 === 0
      ? formatNumber(price)
      : price.toFixed(1);
  return `${formatted}원/${unitType}`;
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

export function formatPercent(n, decimals = 1) {
  if (n == null || isNaN(n)) return '-';
  return Number(n).toFixed(decimals) + '%';
}
