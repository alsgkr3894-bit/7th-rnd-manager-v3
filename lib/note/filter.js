/**
 * lib/note/filter.js — 노트 목록 검색·필터·정렬 순수 로직
 *
 * UI(React)와 분리된 순수 함수 모음. 동작은 _NoteContent의 기존 인라인 로직과 동일하며
 * 단위 테스트로 보장한다. 훅(useNoteFilter)과 컴포넌트가 이 함수들을 재사용한다.
 */

import { STATUSES } from './constants';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function searchText(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => asDisplayText(item))
      .filter(Boolean)
      .join(',');
  }
  return asDisplayText(value);
}

function timeValue(value) {
  const dateValue =
    value instanceof Date || typeof value === 'number' ? value : asDisplayText(value);
  if (!dateValue) return 0;
  const time = new Date(dateValue).getTime();
  return Number.isFinite(time) ? time : 0;
}

/**
 * 검색 인덱스 생성: note.id → 검색 대상 필드를 소문자로 합친 문자열.
 * 키 입력마다 전체 toLowerCase 반복을 피하기 위해 notes 변경 시 1회만 빌드한다.
 * @param {Array<object>} notes
 * @returns {Map<any, string>}
 */
export function buildNoteSearchIndex(notes) {
  const m = new Map();
  for (const n of asObjectArray(notes)) {
    m.set(
      n.id,
      [searchText(n.title), searchText(n.menuName), searchText(n.testContent), searchText(n.tags)]
        .join('\n')
        .toLowerCase()
    );
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
  const list = asObjectArray(notes);
  const m = list.reduce(
    (acc, n) => {
      const status = asDisplayText(n.status);
      if (status) acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { all: list.length }
  );
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
export function filterSortNotes(
  notes,
  {
    statusFilter = 'all',
    brandFilter = 'all',
    search = '',
    sortBy = 'createdAt',
    pinnedIds,
    searchIndex,
  } = {}
) {
  const all = asObjectArray(notes);
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds || []);
  const idx = searchIndex || buildNoteSearchIndex(all);

  const safeStatusFilter = asDisplayText(statusFilter, 'all') || 'all';
  const safeBrandFilter = asDisplayText(brandFilter, 'all') || 'all';
  let list =
    safeStatusFilter === 'all'
      ? all
      : all.filter(n => asDisplayText(n.status) === safeStatusFilter);
  if (safeBrandFilter !== 'all') {
    list = list.filter(n => (asDisplayText(n.brand) || 'main') === safeBrandFilter);
  }
  const q = asDisplayText(search).trim().toLowerCase();
  if (q) list = list.filter(n => (idx.get(n.id) || '').includes(q));

  return [...list].sort((a, b) => {
    const ap = pinned.has(a.id) ? 0 : 1;
    const bp = pinned.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (sortBy === 'menuName')
      return asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko');
    if (sortBy === 'testDate')
      return asDisplayText(b.testDate).localeCompare(asDisplayText(a.testDate));
    return timeValue(b.createdAt) - timeValue(a.createdAt);
  });
}
