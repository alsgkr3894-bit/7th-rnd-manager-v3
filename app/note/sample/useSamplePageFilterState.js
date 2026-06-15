'use client';

import { useEffect, useRef, useState } from 'react';
import { KEYS } from '@/lib/note/keys';
import { tryLS, setLS } from '@/lib/note/storage';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import {
  SAMPLE_RATING_KEYS,
  SAMPLE_SORT_KEYS,
  SAMPLE_VIEW_KEYS,
  pickAllowed,
} from './samplePageStateUtils';

export function useSamplePageFilterState({ searchParams, pathname }) {
  const [search, setSearch] = useState('');
  const {
    history: searchHistory,
    isOpen: showSearchHist,
    setIsOpen: setShowSearchHist,
    scheduleAdd: scheduleSearchHistory,
  } = useSearchHistory(KEYS.SAMPLE_SEARCH_HISTORY);
  const [catFilter, setCatFilter] = useState(() => searchParams.get('cat') || 'all');
  const [ratingMin, setRatingMin] = useState(() => {
    const value = parseInt(searchParams.get('r') || '0', 10);
    return pickAllowed(value, SAMPLE_RATING_KEYS, 0);
  });
  const [sortBy, setSortBy] = useState(() =>
    pickAllowed(tryLS(KEYS.SAMPLE_SORT, 'createdAt'), SAMPLE_SORT_KEYS, 'createdAt')
  );
  const searchBlurTimerRef = useRef(null);
  const [viewMode, setViewMode] = useState(() =>
    pickAllowed(tryLS(KEYS.SAMPLE_VIEW, 'grid'), SAMPLE_VIEW_KEYS, 'grid')
  );

  useEffect(
    () => () => {
      if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (catFilter !== 'all') params.set('cat', catFilter);
    if (ratingMin !== 0) params.set('r', String(ratingMin));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [catFilter, ratingMin, pathname]);

  function handleSearchChange(value) {
    setSearch(value);
    scheduleSearchHistory(value);
  }

  function closeSearchHistorySoon() {
    if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    searchBlurTimerRef.current = setTimeout(() => {
      setShowSearchHist(false);
      searchBlurTimerRef.current = null;
    }, 150);
  }

  function selectSearchHistory(value) {
    handleSearchChange(value);
    setShowSearchHist(false);
  }

  function applySortBy(key) {
    setSortBy(key);
    setLS(KEYS.SAMPLE_SORT, key);
  }

  function applyViewMode(mode) {
    setViewMode(mode);
    setLS(KEYS.SAMPLE_VIEW, mode);
  }

  return {
    search,
    searchHistory,
    showSearchHist,
    setShowSearchHist,
    catFilter,
    setCatFilter,
    ratingMin,
    setRatingMin,
    sortBy,
    applySortBy,
    viewMode,
    applyViewMode,
    handleSearchChange,
    closeSearchHistorySoon,
    selectSearchHistory,
  };
}
