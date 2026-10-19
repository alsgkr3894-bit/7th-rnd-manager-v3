'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { getAllMarketResearch } from '@/lib/note/market-research';
import {
  countByRegion,
  groupByCompetitor,
  includesQuery,
  matchesCountry,
  matchesRegion,
  REGION_FILTER_ALL,
} from './marketUtils';
import { MARKET_COUNTRY_SUGGESTIONS } from '@/lib/note/market-research';
import { competitorOptionsOf, countryOptionsOf, usedCountriesOf } from './marketPageUtils';

/** 시장조사 목록 로드 + 키워드 검색/경쟁사 그룹핑 파생 상태. */
export function useMarketResearchList() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(REGION_FILTER_ALL);
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);

  const regionCounts = useMemo(() => countByRegion(rows), [rows]);
  const usedCountries = useMemo(() => usedCountriesOf(rows), [rows]);
  const countryOptions = useMemo(() => countryOptionsOf(rows, MARKET_COUNTRY_SUGGESTIONS), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter(
        row =>
          matchesRegion(row, region) && matchesCountry(row, country) && includesQuery(row, query)
      ),
    [rows, query, region, country]
  );
  const groupedRows = useMemo(() => groupByCompetitor(filtered), [filtered]);
  const competitorOptions = useMemo(() => competitorOptionsOf(rows), [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getAllMarketResearch());
    } catch (error) {
      console.error('[note/market] load failed', error);
      showToast('시장조사 목록을 불러오지 못했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rows,
    query,
    setQuery,
    region,
    setRegion,
    regionCounts,
    country,
    setCountry,
    usedCountries,
    countryOptions,
    loading,
    filtered,
    groupedRows,
    competitorOptions,
    load,
  };
}
