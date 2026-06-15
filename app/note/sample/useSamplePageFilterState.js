'use client';

import { useEffect, useRef, useState } from 'react';
import { KEYS } from '@/lib/note/keys';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import {
  buildSampleFilterPath,
  persistSampleSortBy,
  persistSampleViewMode,
  readSampleCatFilter,
  readSampleRatingMin,
  readSampleSortBy,
  readSampleViewMode,
} from './samplePageFilterStateUtils';

export function useSamplePageFilterState({ searchParams, pathname }) {
  const [search, setSearch] = useState('');
  const {
    history: searchHistory,
    isOpen: showSearchHist,
    setIsOpen: setShowSearchHist,
    scheduleAdd: scheduleSearchHistory,
  } = useSearchHistory(KEYS.SAMPLE_SEARCH_HISTORY);
  const [catFilter, setCatFilter] = useState(() => readSampleCatFilter(searchParams));
  const [ratingMin, setRatingMin] = useState(() => readSampleRatingMin(searchParams));
  const [sortBy, setSortBy] = useState(readSampleSortBy);
  const searchBlurTimerRef = useRef(null);
  const [viewMode, setViewMode] = useState(readSampleViewMode);

  useEffect(
    () => () => {
      if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    },
    []
  );

  useEffect(() => {
    window.history.replaceState(
      null,
      '',
      buildSampleFilterPath({ pathname, catFilter, ratingMin })
    );
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
    persistSampleSortBy(key);
  }

  function applyViewMode(mode) {
    setViewMode(mode);
    persistSampleViewMode(mode);
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
