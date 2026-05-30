/**
 * lib/nutrition/helpers.js — 영양·원산지·알레르기 모듈 공용 순수 함수
 */

/** displayOrder 오름차순 정렬. 값 없으면 999로 처리 */
export const sortByDisplayOrder = (rows) =>
  [...rows].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
