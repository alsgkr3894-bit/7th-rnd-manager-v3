/**
 * lib/note/utils.js — 메뉴개발노트 / 샘플기록 공용 유틸리티 (순수 함수)
 */

/** 쉼표 구분 태그 문자열 → 태그 배열 */
export function parseTagList(rawTags) {
  return (rawTags || '').split(',').map(t => t.trim()).filter(Boolean);
}

/** YYYY-MM-DD → YYYY.MM.DD (모달·상세 표시용) */
export function formatFullDate(dateStr) {
  return dateStr ? dateStr.replace(/-/g, '.') : '';
}

/** YYYY-MM-DD → MM.DD (카드·칸반 축약 표시용) */
export function formatShortDate(dateStr) {
  return dateStr ? dateStr.slice(5).replace('-', '.') : '';
}

/** 검색어 강조 정규식 생성 */
export function buildHighlightRegex(query) {
  if (!query) return null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escaped})`, 'gi');
}
