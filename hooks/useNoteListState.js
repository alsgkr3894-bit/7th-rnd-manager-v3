'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { tryLS, setLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import { useNoteFilter } from '@/hooks/useNoteFilter';
import { useNotePresets } from '@/hooks/useNotePresets';
import { buildHighlightRegex } from '@/lib/note/utils';
import { normalizeNoteView, shouldShowAllNoteRows } from '@/lib/note/list-state';

const PAGE_SIZE = 20;

export { normalizeNoteView, shouldShowAllNoteRows };

export function useNoteListState({ notes, pinnedIds, pathname }) {
  const [viewMode, setViewMode] = useState('card');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchBlurTimerRef = useRef(null);

  useScrollMemory(pathname);

  useEffect(() => {
    setViewMode(normalizeNoteView(tryLS(KEYS.NOTE_VIEW, 'card')));
  }, []);

  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    brandFilter,
    setBrandFilter,
    counts,
    filtered,
  } = useNoteFilter(notes, pinnedIds, { pathname });

  const {
    presets,
    confirmDeletePreset,
    setConfirmDeletePreset,
    savePreset,
    applyPreset,
    deletePreset,
  } = useNotePresets({ statusFilter, search, sortBy, setStatusFilter, setSearch, setSortBy });

  const {
    history: searchHistory,
    isOpen: showSearchHist,
    setIsOpen: setShowSearchHist,
    add: saveSearchHistory,
    scheduleAdd: scheduleSearchHistory,
    cancelScheduled: cancelSearchHistory,
  } = useSearchHistory(KEYS.NOTE_SEARCH_HISTORY);

  useEffect(
    () => () => {
      if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    },
    []
  );

  const hlRe = useMemo(() => buildHighlightRegex(search.trim()), [search]);
  const showAllRows = shouldShowAllNoteRows(statusFilter);
  const visible = useMemo(
    () => (showAllRows ? filtered : filtered.slice(0, visibleCount)),
    [filtered, visibleCount, showAllRows]
  );
  const hasActiveFilter = statusFilter !== 'all' || search.trim() || sortBy !== 'createdAt';

  function resetVisibleCount() {
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(value) {
    setSearch(value);
    resetVisibleCount();
    scheduleSearchHistory(value);
  }

  function applySearchHistory(term) {
    handleSearchChange(term);
    setShowSearchHist(false);
  }

  function closeSearchHistorySoon() {
    if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    searchBlurTimerRef.current = setTimeout(() => {
      setShowSearchHist(false);
      searchBlurTimerRef.current = null;
    }, 150);
  }

  function changeSort(key) {
    setSortBy(key);
    resetVisibleCount();
  }

  function changeView(mode) {
    setViewMode(mode);
    setLS(KEYS.NOTE_VIEW, mode);
  }

  function changeBrandFilter(nextBrand) {
    setBrandFilter(nextBrand);
    resetVisibleCount();
  }

  function changeStatusFilter(nextStatus) {
    setStatusFilter(nextStatus);
    resetVisibleCount();
  }

  function openChecklistList() {
    setStatusFilter('all');
    handleSearchChange('체크리스트');
    saveSearchHistory('체크리스트');
  }

  function handleTagSearch(tag) {
    setSearch(tag);
    setShowSearchHist(false);
  }

  function loadMore() {
    setVisibleCount(v => v + PAGE_SIZE);
  }

  return {
    viewMode,
    search,
    statusFilter,
    sortBy,
    brandFilter,
    counts,
    filtered,
    visible,
    hlRe,
    presets,
    confirmDeletePreset,
    setConfirmDeletePreset,
    savePreset,
    applyPreset,
    deletePreset,
    searchHistory,
    showSearchHist,
    setShowSearchHist,
    saveSearchHistory,
    cancelSearchHistory,
    closeSearchHistorySoon,
    handleSearchChange,
    applySearchHistory,
    changeSort,
    changeView,
    changeBrandFilter,
    changeStatusFilter,
    openChecklistList,
    handleTagSearch,
    loadMore,
    hasActiveFilter,
  };
}
