'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllSamples, sampleNamesText } from '@/lib/sample';
import { tryLS, setLS } from '@/lib/note/storage';
import { formatDate } from '@/lib/format';
import { KEYS } from '@/lib/note/keys';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { buildCalendarDays } from '@/lib/note/calendar-utils';

export const SAMPLE_SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate', label: '날짜순' },
  { key: 'rating', label: '별점순' },
];

const SAMPLE_SORT_KEYS = new Set(SAMPLE_SORT_OPTIONS.map(option => option.key));
const SAMPLE_VIEW_KEYS = new Set(['grid', 'list', 'calendar']);
const SAMPLE_RATING_KEYS = new Set([-1, 0, 3, 4, 5]);
const CALENDAR_CELLS = 42; // 6주 x 7일, 달력 그리드 고정 칸 수

function pickAllowed(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

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

  const filtered = useMemo(() => {
    let list = samples;
    if (catFilter !== 'all') list = list.filter(sample => sample.category === catFilter);
    if (ratingMin === -1) list = list.filter(sample => !sample.rating);
    else if (ratingMin > 0) list = list.filter(sample => (sample.rating || 0) >= ratingMin);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        sample =>
          (sample.title || '').toLowerCase().includes(query) ||
          sampleNamesText(sample).toLowerCase().includes(query) ||
          (sample.company || '').toLowerCase().includes(query) ||
          (sample.description || '').toLowerCase().includes(query) ||
          (sample.tags || '').toLowerCase().includes(query)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'testDate') return (b.testDate || '').localeCompare(a.testDate || '');
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [samples, catFilter, ratingMin, search, sortBy]);

  const catCounts = useMemo(() => {
    const counts = { all: samples.length };
    for (const sample of samples) counts[sample.category] = (counts[sample.category] || 0) + 1;
    return counts;
  }, [samples]);

  const ratingDist = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, none: 0 };
    for (const sample of samples) {
      const rating = sample.rating || 0;
      if (rating >= 1 && rating <= 5) dist[rating] += 1;
      else dist.none += 1;
    }
    return dist;
  }, [samples]);

  const calDays = useMemo(() => buildCalendarDays(calMonth, CALENDAR_CELLS), [calMonth]);

  const samplesByDate = useMemo(() => {
    const byDate = {};
    for (const sample of samples) {
      if (sample.testDate) (byDate[sample.testDate] ??= []).push(sample);
    }
    return byDate;
  }, [samples]);

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
