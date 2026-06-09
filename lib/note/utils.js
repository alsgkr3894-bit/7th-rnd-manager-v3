/**
 * lib/note/utils.js — 메뉴개발노트 / 샘플기록 공용 유틸리티 (순수 함수)
 */

import { asDisplayText } from '@/lib/ui/prop-guards';

/** 쉼표 구분 태그 문자열 → 태그 배열 */
export function parseTagList(rawTags) {
  if (rawTags == null) return [];
  if (typeof rawTags !== 'string' && typeof rawTags !== 'number') return [];
  return String(rawTags)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

/** YYYY-MM-DD → YYYY.MM.DD (모달·상세 표시용) */
export function formatFullDate(dateStr) {
  const text = asDisplayText(dateStr);
  return text ? text.replace(/-/g, '.') : '';
}

/** YYYY-MM-DD → MM.DD (카드·칸반 축약 표시용) */
export function formatShortDate(dateStr) {
  const text = asDisplayText(dateStr);
  return text ? text.slice(5).replace('-', '.') : '';
}

/** 검색어 강조 정규식 생성 */
export function buildHighlightRegex(query) {
  if (!query) return null;
  const text = asDisplayText(query);
  if (!text) return null;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escaped})`, 'gi');
}
