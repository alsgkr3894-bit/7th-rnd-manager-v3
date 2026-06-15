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

export function useSamplePageState({ searchParams, pathname }) {
  const [samples, setSamples] = useState([]);
  const filterState = useSamplePageFilterState({ searchParams, pathname });
  const { catFilter, ratingMin, search, sortBy } = filterState;
  const [detailRec, setDetailRec] = useState(null);
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
    today: formatDate(new Date()),
  };
}
