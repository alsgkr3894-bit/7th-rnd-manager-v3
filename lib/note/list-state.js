import { NOTE_UNIFIED_TYPE_ALL } from '@/lib/note/unified-records';

const NOTE_VIEW_KEYS = new Set(['card', 'table']);

export function normalizeNoteView(value) {
  return NOTE_VIEW_KEYS.has(value) ? value : 'card';
}

export function shouldShowAllNoteRows(statusFilter) {
  return statusFilter === 'all';
}

/**
 * 노트 목록의 검색/상태/유형 필터를 URL 쿼리스트링으로 조립한다(기본값이면 빈 문자열).
 * 필터 상태의 "정본"은 URL이고, localStorage는 더 이상 이 세 값을 저장하지 않는다 —
 * `/note`로 바로 가면 항상 기본값(전체)으로 열리게 하기 위함(useNoteFilter 참고).
 */
export function buildNoteListQuery({ search, statusFilter, typeFilter } = {}) {
  const p = new URLSearchParams();
  if (search) p.set('q', search);
  if (statusFilter && statusFilter !== 'all') p.set('status', statusFilter);
  if (typeFilter && typeFilter !== NOTE_UNIFIED_TYPE_ALL) p.set('type', typeFilter);
  return p.toString();
}
