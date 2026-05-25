/**
 * lib/sales/categories.js — 카테고리 표시 순서 / 입력 옵션 공통 상수
 *
 * 사용처:
 *   - 카테고리 chip 필터 (정렬 순서)
 *   - 분류 규칙 등록 폼 (카테고리 선택)
 */

/** 표시 순서 (기본 9개) */
export const CATEGORY_ORDER = [
  '피자', '1인피자', '사이드', '사이드(소스)', '엣지&도우',
  '세트메뉴', '하프앤하프', '추가토핑', '음료',
];

/** 입력 폼용 — 기본 9개 + 품목제외 */
export const CATEGORY_INPUT_OPTIONS = [...CATEGORY_ORDER, '품목제외'];
