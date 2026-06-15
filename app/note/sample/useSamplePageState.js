'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllSamples } from '@/lib/sample';
import { tryLS, setLS } from '@/lib/note/storage';
import { formatDate } from '@/lib/format';
import { KEYS } from '@/lib/note/keys';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import {
  SAMPLE_RATING_KEYS,
  SAMPLE_SORT_KEYS,
  SAMPLE_SORT_OPTIONS,
  SAMPLE_VIEW_KEYS,
  buildSampleCalendarDays,
  buildSampleCategoryCounts,
  buildSampleRatingDist,
  buildSamplesByDate,
  filterSortSamples,
  pickAllowed,
} from './samplePageStateUtils';

export { SAMPLE_SORT_OPTIONS };

export function useSamplePageState({ searchParams, pathname }) {
  const [samples, setSamples] = useState([]);
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
  const [detailRec, setDetailRec] = useState(null);
  const searchBlurTimerRef = useRef(null);
  const [viewMode, setViewMode] = useState(() =>
    pickAllowed(tryLS(KEYS.SAMPLE_VIEW, 'grid'), SAMPLE_VIEW_KEYS, 'grid')
  );
  const [calMonth, setCalMonth] = useState(() => new Date());

  const {
    data: loadedSamples,
    loading,
    error: loadError,
    reload,
  } = useDBLoad(() => getAllSamples());

  useEffect(() => {
    if (loadedSamples) setSamples(loadedSamples);
  }, [loadedSamples]);

  useVisibilityRefresh(reload);

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

  function goPrevMonth() {
    setCalMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setCalMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  const filtered = useMemo(
    () => filterSortSamples(samples, { catFilter, ratingMin, search, sortBy }),
    [samples, catFilter, ratingMin, search, sortBy]
  );

  const catCounts = useMemo(() => buildSampleCategoryCounts(samples), [samples]);

  const ratingDist = useMemo(() => buildSampleRatingDist(samples), [samples]);

  const calDays = useMemo(() => buildSampleCalendarDays(calMonth), [calMonth]);

  const samplesByDate = useMemo(() => buildSamplesByDate(samples), [samples]);

  return {
    samples,
    setSamples,
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
    calMonth,
    goPrevMonth,
    goNextMonth,
    detailRec,
    setDetailRec,
    loading,
    loadError,
    reload,
    handleSearchChange,
    closeSearchHistorySoon,
    selectSearchHistory,
    filtered,
    catCounts,
    ratingDist,
    calDays,
    samplesByDate,
    today: formatDate(new Date()),
  };
}
