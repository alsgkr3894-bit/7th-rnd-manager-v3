'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAllSamples } from '@/lib/sample';
import { formatDate } from '@/lib/format';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import {
  SAMPLE_SORT_OPTIONS,
  buildSampleCalendarDays,
  buildSampleCategoryCounts,
  buildSampleRatingDist,
  buildSamplesByDate,
  filterSortSamples,
} from './samplePageStateUtils';
import { useSamplePageFilterState } from './useSamplePageFilterState';

export { SAMPLE_SORT_OPTIONS };

const INITIAL_CALENDAR_MONTH = new Date(2026, 0, 1);
const INITIAL_TODAY = '2026-01-01';

export function useSamplePageState({ searchParams, pathname }) {
  const [samples, setSamples] = useState([]);
  const filterState = useSamplePageFilterState({ searchParams, pathname });
  const { catFilter, ratingMin, search, sortBy } = filterState;
  const [detailRec, setDetailRec] = useState(null);
  const [calMonth, setCalMonth] = useState(INITIAL_CALENDAR_MONTH);
  const [today, setToday] = useState(INITIAL_TODAY);

  const {
    data: loadedSamples,
    loading,
    error: loadError,
    reload,
  } = useDBLoad(() => getAllSamples());

  useEffect(() => {
    if (loadedSamples) setSamples(loadedSamples);
  }, [loadedSamples]);

  useEffect(() => {
    const now = new Date();
    setCalMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setToday(formatDate(now));
  }, []);

  useVisibilityRefresh(reload);

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

  // 캘린더도 grid/list와 동일하게 활성 필터(카테고리·검색·평점)를 반영해야 한다.
  const samplesByDate = useMemo(() => buildSamplesByDate(filtered), [filtered]);

  return {
    samples,
    setSamples,
    ...filterState,
    calMonth,
    goPrevMonth,
    goNextMonth,
    detailRec,
    setDetailRec,
    loading,
    loadError,
    reload,
    filtered,
    catCounts,
    ratingDist,
    calDays,
    samplesByDate,
    today,
  };
}
