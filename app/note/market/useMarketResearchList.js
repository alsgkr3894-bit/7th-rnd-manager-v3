'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { getAllMarketResearch } from '@/lib/note/market-research';
import { groupByCompetitor, includesQuery } from './marketUtils';
import { competitorOptionsOf } from './marketPageUtils';

/** 시장조사 목록 로드 + 키워드 검색/경쟁사 그룹핑 파생 상태. */
export function useMarketResearchList() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const filtered = useMemo(() => rows.filter(row => includesQuery(row, query)), [rows, query]);
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

  return { rows, query, setQuery, loading, filtered, groupedRows, competitorOptions, load };
}
