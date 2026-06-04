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
  // 초기값은 SSR/첫 렌더에서 서버와 동일하게 'all'로 두고(활성 브랜드는 localStorage라
  // 서버에서 알 수 없음 → 칩 active 클래스 불일치 방지), 마운트 후 실제 값으로 교정한다.
  const [brandFilter, setBrandFilter] = useState('all');
  const [brandReady, setBrandReady] = useState(false);
  useEffect(() => {
    setBrandFilter(tryLS(KEYS.NOTE_BRAND_FILTER, getActiveBrandId()));
    setBrandReady(true);
  }, []);

  // 영속화 (기존 동작과 동일한 키)
  useEffect(() => { setLS(KEYS.NOTE_SEARCH, search); }, [search]);
  useEffect(() => { setLS(KEYS.NOTE_STATUS, statusFilter); }, [statusFilter]);
  useEffect(() => { setLS(KEYS.NOTE_SORT, sortBy); }, [sortBy]);
  // 첫 마운트 교정 전에는 영속화하지 않는다(임시 'all'로 덮어쓰기 방지).
  useEffect(() => { if (brandReady) setLS(KEYS.NOTE_BRAND_FILTER, brandFilter); }, [brandFilter, brandReady]);

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
