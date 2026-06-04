'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { tryLS, setLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { buildNoteSearchIndex, countNotesByStatus, filterSortNotes } from '@/lib/note/filter';
import { getActiveBrandId } from '@/lib/active-brand';

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

  const [search, setSearch] = useState(() => searchParams.get('q') || tryLS(KEYS.NOTE_SEARCH, ''));
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || tryLS(KEYS.NOTE_STATUS, 'all'));
  const [sortBy, setSortBy] = useState(() => tryLS(KEYS.NOTE_SORT, 'createdAt'));
  // 브랜드 필터: 기본값은 현재 활성 브랜드(다른 브랜드 노트와 섞이지 않게). 'all'이면 전체.
  const [brandFilter, setBrandFilter] = useState(() => tryLS(KEYS.NOTE_BRAND_FILTER, getActiveBrandId()));

  // 영속화 (기존 동작과 동일한 키)
  useEffect(() => { setLS(KEYS.NOTE_SEARCH, search); }, [search]);
  useEffect(() => { setLS(KEYS.NOTE_STATUS, statusFilter); }, [statusFilter]);
  useEffect(() => { setLS(KEYS.NOTE_SORT, sortBy); }, [sortBy]);
  useEffect(() => { setLS(KEYS.NOTE_BRAND_FILTER, brandFilter); }, [brandFilter]);

  // URL 동기화 (검색/상태만)
  useEffect(() => {
    if (!pathname) return;
    const p = new URLSearchParams();
    if (search)                 p.set('q', search);
    if (statusFilter !== 'all') p.set('status', statusFilter);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [search, statusFilter, pathname]);

  const counts = useMemo(() => countNotesByStatus(notes), [notes]);
  const searchIndex = useMemo(() => buildNoteSearchIndex(notes), [notes]);
  const filtered = useMemo(
    () => filterSortNotes(notes, { statusFilter, brandFilter, search, sortBy, pinnedIds, searchIndex }),
    [notes, statusFilter, brandFilter, search, sortBy, pinnedIds, searchIndex],
  );

  return {
    search, setSearch, statusFilter, setStatusFilter, sortBy, setSortBy,
    brandFilter, setBrandFilter, counts, searchIndex, filtered,
  };
}
