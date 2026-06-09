'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { tryLS, setLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { buildNoteSearchIndex, countNotesByStatus, filterSortNotes } from '@/lib/note/filter';
import { NOTE_BRANDS, STATUSES } from '@/lib/note/constants';
import { getActiveBrandId } from '@/lib/active-brand';

const NOTE_STATUS_KEYS = new Set(['all', ...STATUSES]);
const NOTE_SORT_KEYS = new Set(['createdAt', 'menuName', 'testDate']);
const NOTE_BRAND_KEYS = new Set(['all', ...NOTE_BRANDS.map(brand => brand.id)]);

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
  return pickAllowed(value, NOTE_STATUS_KEYS, 'all');
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
 * - 초기값: URL query(q/status) > localStorage > 기본값 순.
 * - search/statusFilter/sortBy 변경 시 localStorage에 영속,
 *   search/statusFilter는 URL(replaceState)에도 동기화.
 * - 파생: counts(상태별 개수), searchIndex(검색 인덱스), filtered(필터·정렬된 목록).
 *
 * @param {Array<object>} notes
 * @param {Set<any>} pinnedIds - 상단 고정 note.id 집합
 * @param {{ pathname: string }} opts
 */
export function useNoteFilter(notes, pinnedIds, { pathname } = {}) {
  const searchParams = useSearchParams();

  const [search, setRawSearch] = useState(() =>
    normalizeNoteFilterText(searchParams.get('q') || tryLS(KEYS.NOTE_SEARCH, ''))
  );
  const [statusFilter, setRawStatusFilter] = useState(() =>
    normalizeNoteStatusFilter(searchParams.get('status') || tryLS(KEYS.NOTE_STATUS, 'all'))
  );
  const [sortBy, setRawSortBy] = useState(() =>
    normalizeNoteSortKey(tryLS(KEYS.NOTE_SORT, 'createdAt'))
  );
  // 브랜드 필터: 기본값은 현재 활성 브랜드(다른 브랜드 노트와 섞이지 않게). 'all'이면 전체.
  // 초기값은 SSR/첫 렌더에서 서버와 동일하게 'all'로 두고(활성 브랜드는 localStorage라
  // 서버에서 알 수 없음 → 칩 active 클래스 불일치 방지), 마운트 후 실제 값으로 교정한다.
  const [brandFilter, setRawBrandFilter] = useState('all');
  const [brandReady, setBrandReady] = useState(false);
  const setSearch = useCallback(value => setRawSearch(normalizeNoteFilterText(value)), []);
  const setStatusFilter = useCallback(
    value => setRawStatusFilter(normalizeNoteStatusFilter(value)),
    []
  );
  const setSortBy = useCallback(value => setRawSortBy(normalizeNoteSortKey(value)), []);
  const setBrandFilter = useCallback(
    value => setRawBrandFilter(normalizeNoteBrandFilter(value)),
    []
  );
  const safeSearch = normalizeNoteFilterText(search);
  const safeStatusFilter = normalizeNoteStatusFilter(statusFilter);
  const safeSortBy = normalizeNoteSortKey(sortBy);
  const safeBrandFilter = normalizeNoteBrandFilter(brandFilter);

  useEffect(() => {
    const activeBrand = normalizeNoteBrandFilter(getActiveBrandId(), 'main');
    setRawBrandFilter(
      normalizeNoteBrandFilter(tryLS(KEYS.NOTE_BRAND_FILTER, activeBrand), activeBrand)
    );
    setBrandReady(true);
  }, []);

  // 영속화 (기존 동작과 동일한 키)
  useEffect(() => {
    setLS(KEYS.NOTE_SEARCH, safeSearch);
  }, [safeSearch]);
  useEffect(() => {
    setLS(KEYS.NOTE_STATUS, safeStatusFilter);
  }, [safeStatusFilter]);
  useEffect(() => {
    setLS(KEYS.NOTE_SORT, safeSortBy);
  }, [safeSortBy]);
  // 첫 마운트 교정 전에는 영속화하지 않는다(임시 'all'로 덮어쓰기 방지).
  useEffect(() => {
    if (brandReady) setLS(KEYS.NOTE_BRAND_FILTER, safeBrandFilter);
  }, [safeBrandFilter, brandReady]);

  // URL 동기화 (검색/상태만)
  useEffect(() => {
    if (!pathname) return;
    const p = new URLSearchParams();
    if (safeSearch) p.set('q', safeSearch);
    if (safeStatusFilter !== 'all') p.set('status', safeStatusFilter);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [safeSearch, safeStatusFilter, pathname]);

  // 상태 칩 카운트는 브랜드 필터 적용 후 기준 — 칩 숫자와 실제 목록 불일치 방지
  const brandFiltered = useMemo(() => {
    if (!brandReady || safeBrandFilter === 'all') return notes;
    return notes.filter(n => (n.brand || 'main') === safeBrandFilter);
  }, [notes, safeBrandFilter, brandReady]);
  const counts = useMemo(() => countNotesByStatus(brandFiltered), [brandFiltered]);
  const searchIndex = useMemo(() => buildNoteSearchIndex(notes), [notes]);
  const filtered = useMemo(
    () =>
      filterSortNotes(notes, {
        statusFilter: safeStatusFilter,
        brandFilter: safeBrandFilter,
        search: safeSearch,
        sortBy: safeSortBy,
        pinnedIds,
        searchIndex,
      }),
    [notes, safeStatusFilter, safeBrandFilter, safeSearch, safeSortBy, pinnedIds, searchIndex]
  );

  return {
    search: safeSearch,
    setSearch,
    statusFilter: safeStatusFilter,
    setStatusFilter,
    sortBy: safeSortBy,
    setSortBy,
    brandFilter: safeBrandFilter,
    setBrandFilter,
    counts,
    searchIndex,
    filtered,
  };
}
