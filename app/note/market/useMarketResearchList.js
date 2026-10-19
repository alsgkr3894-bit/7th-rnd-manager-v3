'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { getAllMarketResearch } from '@/lib/note/market-research';
import {
  countByBrandType,
  countByRegion,
  groupByCompetitor,
  includesQuery,
  matchesBrandType,
  matchesCountry,
  matchesRegion,
  REGION_FILTER_ALL,
  staleFilterResets,
} from './marketUtils';
import { MARKET_COUNTRY_SUGGESTIONS } from '@/lib/note/market-research';
import { competitorOptionsOf, countryOptionsOf, usedCountriesOf } from './marketPageUtils';

/** 시장조사 목록 로드 + 키워드 검색/경쟁사 그룹핑 파생 상태. */
export function useMarketResearchList() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(REGION_FILTER_ALL);
  const [country, setCountry] = useState('');
  const [brandType, setBrandType] = useState('');
  const [loading, setLoading] = useState(true);

  const regionCounts = useMemo(() => countByRegion(rows), [rows]);
  const brandTypeCounts = useMemo(() => countByBrandType(rows), [rows]);
  const usedCountries = useMemo(() => usedCountriesOf(rows), [rows]);
  const countryOptions = useMemo(() => countryOptionsOf(rows, MARKET_COUNTRY_SUGGESTIONS), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter(
        row =>
          matchesRegion(row, region) &&
          matchesBrandType(row, brandType) &&
          matchesCountry(row, country) &&
          includesQuery(row, query)
      ),
    [rows, query, region, brandType, country]
  );
  // 목록 위 필터(국내/해외·업종·국가)를 한 묶음으로 넘긴다
  const filters = {
    region,
    setRegion,
    regionCounts,
    brandType,
    setBrandType,
    brandTypeCounts,
    country,
    setCountry,
    usedCountries,
  };
  const groupedRows = useMemo(() => groupByCompetitor(filtered), [filtered]);

  // 고른 국가·미분류 필터가 수정·삭제로 사라졌으면 풀어 준다(빈 목록에 갇히지 않게)
  useEffect(() => {
    const resets = staleFilterResets({ region, country, usedCountries, regionCounts });
    if (!resets) return;
    if ('country' in resets) setCountry(resets.country);
    if ('region' in resets) setRegion(resets.region);
  }, [region, country, usedCountries, regionCounts]);
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
    filters,
    countryOptions,
    loading,
    filtered,
    groupedRows,
    competitorOptions,
    load,
  };
}
