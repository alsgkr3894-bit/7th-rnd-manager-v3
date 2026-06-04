/**
 * lib/note/filter.js — 노트 목록 검색·필터·정렬 순수 로직
 *
 * UI(React)와 분리된 순수 함수 모음. 동작은 _NoteContent의 기존 인라인 로직과 동일하며
 * 단위 테스트로 보장한다. 훅(useNoteFilter)과 컴포넌트가 이 함수들을 재사용한다.
 */

import { STATUSES } from './constants';

/**
 * 검색 인덱스 생성: note.id → 검색 대상 필드를 소문자로 합친 문자열.
 * 키 입력마다 전체 toLowerCase 반복을 피하기 위해 notes 변경 시 1회만 빌드한다.
 * @param {Array<object>} notes
 * @returns {Map<any, string>}
 */
export function buildNoteSearchIndex(notes) {
  const m = new Map();
  for (const n of (notes || [])) {
    m.set(n.id, `${n.title || ''}\n${n.menuName || ''}\n${n.testContent || ''}\n${n.tags || ''}`.toLowerCase());
  }
  return m;
}

/**
 * 상태별 노트 개수( + 전체 'all' ). 등장하지 않은 상태는 0으로 채운다.
 * @param {Array<object>} notes
 * @param {string[]} [statuses=STATUSES]
 * @returns {Record<string, number>}
 */
export function countNotesByStatus(notes, statuses = STATUSES) {
  const list = notes || [];
  const m = list.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, { all: list.length });
  for (const s of statuses) if (!(s in m)) m[s] = 0;
  return m;
}

/**
 * 상태 필터 + 검색 + 정렬(고정 항목 우선)을 적용한 새 배열을 반환.
 * @param {Array<object>} notes
 * @param {object} opts
 * @param {string} [opts.statusFilter='all']
 * @param {string} [opts.brandFilter='all']   - 'all' | 브랜드 id. 빈 brand 레코드는 'main' 취급
 * @param {string} [opts.search='']
 * @param {string} [opts.sortBy='createdAt']  - 'menuName' | 'testDate' | 그 외(createdAt 내림차순)
 * @param {Set<any>|Array<any>} [opts.pinnedIds]  - 상단 고정할 note.id 집합
 * @param {Map<any,string>} [opts.searchIndex]    - 미전달 시 즉석 생성
 * @returns {Array<object>}
 */
export function filterSortNotes(notes, {
  statusFilter = 'all', brandFilter = 'all', search = '', sortBy = 'createdAt', pinnedIds, searchIndex,
} = {}) {
  const all = notes || [];
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds || []);
  const idx = searchIndex || buildNoteSearchIndex(all);

  let list = statusFilter === 'all' ? all : all.filter(n => n.status === statusFilter);
  if (brandFilter !== 'all') list = list.filter(n => (n.brand || 'main') === brandFilter);
  const q = (search || '').trim().toLowerCase();
  if (q) list = list.filter(n => (idx.get(n.id) || '').includes(q));

  return [...list].sort((a, b) => {
    const ap = pinned.has(a.id) ? 0 : 1;
    const bp = pinned.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (sortBy === 'menuName') return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
    if (sortBy === 'testDate') return (b.testDate || '').localeCompare(a.testDate || '');
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}
