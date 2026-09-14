'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { tryLS, setLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { buildNoteListQuery } from '@/lib/note/list-state';
import {
  buildNoteSearchIndex,
  countNotesByStatus,
  countNotesByType,
  filterNoteListNotes,
  filterSortNotes,
} from '@/lib/note/filter';
import { NOTE_BRANDS, STATUSES, normalizeNoteStatus } from '@/lib/note/constants';
import {
  NOTE_UNIFIED_TYPES,
  NOTE_UNIFIED_TYPE_ALL,
  normalizeUnifiedTypeFilter,
} from '@/lib/note/unified-records';
import { getActiveBrandId } from '@/lib/active-brand';

const NOTE_STATUS_KEYS = new Set(['all', ...STATUSES]);
const NOTE_SORT_KEYS = new Set(['createdAt', 'menuName', 'testDate']);
const NOTE_BRAND_KEYS = new Set(['all', ...NOTE_BRANDS.map(brand => brand.id)]);
const NOTE_TYPE_KEYS = new Set([NOTE_UNIFIED_TYPE_ALL, ...NOTE_UNIFIED_TYPES]);

export function normalizeNoteFilterText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function pickAllowed(value, allowed, fallback) {
  const text = normalizeNoteFilterText(value).trim();
  if (allowed.has(text)) return text;
  return allowed.has(fallback) ? fallback : [...allowed][0];
}

export function normalizeNoteStatusFilter(value) {
  const text = normalizeNoteFilterText(value).trim();
  if (text === 'all') return 'all';
  if (!text) return 'all';
  return pickAllowed(normalizeNoteStatus(text), NOTE_STATUS_KEYS, 'all');
}

export function normalizeNoteTypeFilter(value) {
  return pickAllowed(normalizeUnifiedTypeFilter(value), NOTE_TYPE_KEYS, NOTE_UNIFIED_TYPE_ALL);
}

export function normalizeNoteSortKey(value) {
  return pickAllowed(value, NOTE_SORT_KEYS, 'createdAt');
}

export function normalizeNoteBrandFilter(value, fallback = 'all') {
  return pickAllowed(value, NOTE_BRAND_KEYS, fallback);
}

/**
 * 노트 목록의 검색/상태필터/정렬 상태와 파생 데이터를 관리하는 훅.
 *
 * - 초기값: search/statusFilter/typeFilter는 URL query만 본다(없으면 기본값 "전체") —
 *   `/note`로 바로 가면 항상 기본값으로 열리게 하기 위해 localStorage는 더 이상 안 씀.
 *   sortBy만 localStorage에 남아 있다.
 * - search/statusFilter/typeFilter는 URL(replaceState)에 동기화, sortBy는 localStorage에 영속.
 * - 같은 라우트로 다시 이동(예: 사이드바 "노트 목록" 재클릭)해도 리마운트가 안 돼 위 마운트
 *   효과가 재실행되지 않으므로, URL이 바뀌면 그 값으로 state를 되돌리는 역동기화 효과가 있다.
 * - 파생: counts(상태별 개수), searchIndex(검색 인덱스), filtered(필터·정렬된 목록).
 *
 * @param {Array<object>} notes
 * @param {Set<any>} pinnedIds - 상단 고정 note.id 집합
 * @param {{ pathname: string }} opts
 */
export function useNoteFilter(notes, pinnedIds, { pathname } = {}) {
  const searchParams = useSearchParams();
  const initialQueryRef = useRef(searchParams.toString());

  const [search, setRawSearch] = useState('');
  const [statusFilter, setRawStatusFilter] = useState('all');
  const [typeFilter, setRawTypeFilter] = useState(NOTE_UNIFIED_TYPE_ALL);
  const [sortBy, setRawSortBy] = useState('createdAt');
  const [filtersReady, setFiltersReady] = useState(false);
  // 목록 화면은 활성 브랜드 DB 기준으로만 보여준다. SSR 첫 렌더는 'all'로 두고
  // 마운트 후 실제 활성 브랜드 id로 교정해 저장/검색 결과와 일치시킨다.
  const [brandFilter, setRawBrandFilter] = useState('all');
  const [brandReady, setBrandReady] = useState(false);
  const setSearch = useCallback(value => setRawSearch(normalizeNoteFilterText(value)), []);
  const setStatusFilter = useCallback(
    value => setRawStatusFilter(normalizeNoteStatusFilter(value)),
    []
  );
  const setTypeFilter = useCallback(value => setRawTypeFilter(normalizeNoteTypeFilter(value)), []);
  const setSortBy = useCallback(value => setRawSortBy(normalizeNoteSortKey(value)), []);
  const setBrandFilter = useCallback(
    value => setRawBrandFilter(normalizeNoteBrandFilter(value)),
    []
  );
  const safeSearch = normalizeNoteFilterText(search);
  const safeStatusFilter = normalizeNoteStatusFilter(statusFilter);
  const safeTypeFilter = normalizeNoteTypeFilter(typeFilter);
  const safeSortBy = normalizeNoteSortKey(sortBy);
  const safeBrandFilter = normalizeNoteBrandFilter(brandFilter);

  useEffect(() => {
    const initialParams = new URLSearchParams(initialQueryRef.current);
    setRawSearch(normalizeNoteFilterText(initialParams.get('q') || ''));
    setRawStatusFilter(normalizeNoteStatusFilter(initialParams.get('status') || 'all'));
    setRawTypeFilter(normalizeNoteTypeFilter(initialParams.get('type') || NOTE_UNIFIED_TYPE_ALL));
    setRawSortBy(normalizeNoteSortKey(tryLS(KEYS.NOTE_SORT, 'createdAt')));
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    const activeBrand = normalizeNoteBrandFilter(getActiveBrandId(), 'main');
    setRawBrandFilter(activeBrand);
    setBrandReady(true);
  }, []);

  // 영속화 — search/statusFilter/typeFilter는 더 이상 localStorage에 저장하지 않는다.
  // "정본"은 URL이고, 이 값들이 남아 있으면 /note로 바로 가도 지난 필터가 복원돼
  // "전체 기본값"으로 안 열리는 문제가 있었다. sortBy(정렬)만 화면을 옮겨다녀도 유지되는 게
  // 자연스러워 그대로 localStorage에 남긴다.
  useEffect(() => {
    if (!filtersReady) return;
    setLS(KEYS.NOTE_SORT, safeSortBy);
  }, [safeSortBy, filtersReady]);
  // 목록은 활성 브랜드 DB 기준으로만 표시하므로 별도 브랜드 필터 UI/저장은 사용하지 않는다.
  useEffect(() => {
    if (brandReady) setLS(KEYS.NOTE_BRAND_FILTER, safeBrandFilter);
  }, [safeBrandFilter, brandReady]);

  // URL 동기화 (검색/상태/유형)
  useEffect(() => {
    if (!filtersReady) return;
    if (!pathname) return;
    const qs = buildNoteListQuery({
      search: safeSearch,
      statusFilter: safeStatusFilter,
      typeFilter: safeTypeFilter,
    });
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [safeSearch, safeStatusFilter, safeTypeFilter, pathname, filtersReady]);

  // URL → state 역동기화. 사이드바 "노트 목록"처럼 같은 라우트(/note)로 다시 이동하면
  // Next.js가 리마운트하지 않아 위 마운트 효과가 다시 돌지 않는다 — 주소창이 실제로
  // 바뀌었는데(예: ?status=보류 → 그냥 /note) 우리 상태가 그대로면, 이 효과가 주소창
  // 값으로 되돌린다. replaceState 직후의 searchParams는 stale할 수 있어 실제 주소창
  // (window.location.search)과 비교한다.
  const filterStateRef = useRef(null);
  filterStateRef.current = {
    search: safeSearch,
    statusFilter: safeStatusFilter,
    typeFilter: safeTypeFilter,
  };
  const searchParamsKey = searchParams.toString();
  useEffect(() => {
    if (!filtersReady) return;
    if (typeof window === 'undefined') return;
    const current = window.location.search.replace(/^\?/, '');
    if (current === buildNoteListQuery(filterStateRef.current)) return;
    const params = new URLSearchParams(current);
    setRawSearch(normalizeNoteFilterText(params.get('q') || ''));
    setRawStatusFilter(normalizeNoteStatusFilter(params.get('status') || 'all'));
    setRawTypeFilter(normalizeNoteTypeFilter(params.get('type') || NOTE_UNIFIED_TYPE_ALL));
  }, [searchParamsKey, filtersReady]);

  const listNotes = useMemo(() => filterNoteListNotes(notes), [notes]);

  // 상태 칩 카운트는 활성 브랜드 기준 — 칩 숫자와 실제 목록 불일치 방지
  const brandFiltered = useMemo(() => {
    if (!brandReady || safeBrandFilter === 'all') return listNotes;
    return listNotes.filter(n => (n.brand || 'main') === safeBrandFilter);
  }, [listNotes, safeBrandFilter, brandReady]);
  const counts = useMemo(() => countNotesByStatus(brandFiltered), [brandFiltered]);
  const typeCounts = useMemo(() => countNotesByType(brandFiltered), [brandFiltered]);
  const searchIndex = useMemo(() => buildNoteSearchIndex(listNotes), [listNotes]);
  const filtered = useMemo(
    () =>
      filterSortNotes(listNotes, {
        statusFilter: safeStatusFilter,
        typeFilter: safeTypeFilter,
        brandFilter: safeBrandFilter,
        search: safeSearch,
        sortBy: safeSortBy,
        pinnedIds,
        searchIndex,
      }),
    [
      listNotes,
      safeStatusFilter,
      safeTypeFilter,
      safeBrandFilter,
      safeSearch,
      safeSortBy,
      pinnedIds,
      searchIndex,
    ]
  );

  return {
    search: safeSearch,
    setSearch,
    statusFilter: safeStatusFilter,
    setStatusFilter,
    typeFilter: safeTypeFilter,
    setTypeFilter,
    sortBy: safeSortBy,
    setSortBy,
    brandFilter: safeBrandFilter,
    setBrandFilter,
    counts,
    typeCounts,
    searchIndex,
    filtered,
  };
}
