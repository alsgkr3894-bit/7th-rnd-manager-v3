/**
 * lib/normalize.js — 메뉴명/제품명 정규화
 *
 * v2 src/common/normalize.js 이식.
 */

export function trimSpaces(str) {
  if (str == null) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

/** PS → PCS 표기 통일 (내부 사용) */
function normalizePCS(str) {
  if (str == null) return '';
  return String(str).replace(/(\d+)\s*PS\b/gi, '$1PCS');
}

/** 메뉴명 정규화: PCS 표기 통일 + trim + 공백 단일화 */
export function normalizeMenuName(raw) {
  if (raw == null) return '';
  let s = String(raw);
  s = normalizePCS(s);
  s = trimSpaces(s);
  return s;
}

/** 제품명 정규화: trim + 공백 단일화 */
export function normalizeProductName(raw) {
  if (raw == null) return '';
  return trimSpaces(String(raw));
}
