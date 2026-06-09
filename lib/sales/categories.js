/**
 * lib/sales/categories.js — 카테고리 표시 순서 / 입력 옵션 공통 상수
 *
 * 사용처:
 *   - 카테고리 chip 필터 (정렬 순서)
 *   - 분류 규칙 등록 폼 (카테고리 선택)
 */

import { asDisplayText } from '../ui/prop-guards.js';

/** 표시 순서 (기본 9개) */
export const CATEGORY_ORDER = [
  '피자',
  '1인피자',
  '사이드',
  '사이드(소스)',
  '엣지&도우',
  '세트메뉴',
  '하프앤하프',
  '추가토핑',
  '음료',
];

/** 입력 폼용 — 기본 9개 + 품목제외 */
export const CATEGORY_INPUT_OPTIONS = [...CATEGORY_ORDER, '품목제외'];

/**
 * 상승/하락 무버 집계 대상 카테고리.
 * 양쪽 기간 모두 판매가 있는 메뉴 중 이 카테고리만 뽑아 순위를 계산한다.
 */
export const MOVER_CATEGORIES = ['피자', '사이드', '1인피자'];

/**
 * CATEGORY_ORDER 기준으로 정렬된 카테고리 목록을 반환한다.
 * 순서에 없는 카테고리는 뒤에 알파벳순으로 붙는다.
 *
 * @param {Set<string>|string[]} found - 실제 존재하는 카테고리 컬렉션
 * @param {string[]} prefix - 목록 앞에 삽입할 항목 (예: ['전체'])
 */
export function buildOrderedCategories(found, prefix = []) {
  const values =
    found instanceof Set || Array.isArray(found)
      ? Array.from(found)
          .map(value => asDisplayText(value))
          .filter(Boolean)
      : [];
  const prefixValues = Array.isArray(prefix)
    ? prefix.map(value => asDisplayText(value)).filter(Boolean)
    : [];
  const set = new Set(values);
  const ordered = CATEGORY_ORDER.filter(c => set.has(c));
  const extras = Array.from(set).filter(c => !CATEGORY_ORDER.includes(c));
  return [...prefixValues, ...ordered, ...extras];
}
