/**
 * lib/sales/normalize.js — 메뉴명 정규화 (순수 함수)
 *
 * 책임:
 * - rawMenuName → normalizedMenuName 변환
 * - 띄어쓰기 정규화 / 괄호 제거 / 특수 표기 정규화
 *
 * 금지:
 * - 숫자단위 제거 / 의미 변경 / DB 접근
 */

/** 연속 공백 → 단일 공백 */
function trimMultipleSpaces(str) {
  if (str == null) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

/**
 * 괄호를 공백으로 변환 (안 내용 보존)
 * "샘스테이크(L)" → "샘스테이크 L"
 */
function removeBrackets(str) {
  if (str == null) return '';
  return String(str)
    .replace(/[\[\{\(]/g, ' ')
    .replace(/[\]\}\)]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * 메뉴명 정규화
 *
 * 처리 순서:
 *   1. 연속 공백 정규화
 *   2. 괄호 제거
 *   3. 최종 공백 정리
 *   4. 특정 단어 표기 통일 (오븐 스파게티 → 오븐스파게티)
 */
export function normalizeMenuName(raw) {
  if (raw == null) return '';
  let s = String(raw);
  s = trimMultipleSpaces(s);
  s = removeBrackets(s);
  s = trimMultipleSpaces(s);
  s = s.replace('오븐 스파게티', '오븐스파게티');
  return s;
}
