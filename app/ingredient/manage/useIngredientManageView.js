'use client';

import { useMemo } from 'react';
import {
  DISCONTINUED_FILTER,
  NO_PRICE_FILTER,
  UNCATEGORIZED_FILTER,
} from '@/lib/ingredient/constants';
import { computeIngredientIssues, sortHashTags, sortMainCategories } from '@/lib/ingredient';
import { isIngredientMissingPackagePrice } from '@/lib/ingredient/price-status';
import { buildDuplicateDiagnostics } from './_duplicate-diagnostics';

export function useIngredientManageView({
  rows,
  prevPriceMap,
  catFilter,
  tagFilter,
  debouncedSearch,
  loading,
  priceDate,
}) {
  const activeRows = useMemo(() => rows.filter(row => !row.discontinued), [rows]);
  const managedCount = useMemo(() => rows.filter(row => row.hasRecord).length, [rows]);
  const discontinuedCount = rows.length - activeRows.length;

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    for (const row of activeRows) {
      if (!row.category) continue;
      counts.set(row.category, (counts.get(row.category) || 0) + 1);
    }
    return counts;
  }, [activeRows]);

  const mainCats = useMemo(() => sortMainCategories([...categoryCounts.keys()]), [categoryCounts]);

  const tagCounts = useMemo(() => {
    const counts = new Map();
    for (const row of activeRows) {
      for (const tag of row.tags || []) {
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return counts;
  }, [activeRows]);

  const hashTags = useMemo(() => sortHashTags([...tagCounts.keys()]), [tagCounts]);

  const originSuggestions = useMemo(() => {
    const names = new Set();
    const countries = new Set();
    for (const row of rows) {
      const origin = row.origin;
      if (!origin) continue;
      const items = Array.isArray(origin) ? origin : [origin];
      for (const item of items) {
        if (item.displayName) names.add(item.displayName);
        if (item.country) countries.add(item.country);
      }
    }
    return { names: [...names], countries: [...countries] };
  }, [rows]);

  const uncategorized = useMemo(
    () => rows.filter(row => !row.discontinued && !row.excluded && !row.category).length,
    [rows]
  );

  const noPriceCount = useMemo(
    () => rows.filter(isIngredientMissingPackagePrice).length,
    [rows]
  );

  const issueRows = useMemo(
    () => computeIngredientIssues(rows, prevPriceMap),
    [rows, prevPriceMap]
  );

  const duplicateDiagnostics = useMemo(() => buildDuplicateDiagnostics(rows), [rows]);
  const duplicateGroupCount = useMemo(
    () => duplicateDiagnostics.reduce((sum, check) => sum + check.groups.length, 0),
    [duplicateDiagnostics]
  );

  // 단종된 식자재에만 남아 있고 활성 식자재에 없는 분류/태그 → 정리 후보
  const unusedCategories = useMemo(() => {
    const activeCats = new Set(activeRows.map(r => r.category).filter(Boolean));
    const discontinued = rows.filter(r => r.discontinued);
    const stale = new Set(discontinued.map(r => r.category).filter(Boolean));
    return [...stale].filter(c => !activeCats.has(c)).sort();
  }, [rows, activeRows]);

  const unusedTags = useMemo(() => {
    const activeTags = new Set(activeRows.flatMap(r => r.tags || []).filter(Boolean));
    const discontinued = rows.filter(r => r.discontinued);
    const stale = new Set(discontinued.flatMap(r => r.tags || []).filter(Boolean));
    return [...stale].filter(t => !activeTags.has(t)).sort();
  }, [rows, activeRows]);

  const filtered = useMemo(() => {
    let list;
    if (catFilter === DISCONTINUED_FILTER) {
      list = rows.filter(row => row.discontinued);
    } else {
      list = rows.filter(row => !row.discontinued && !row.excluded);
      if (catFilter === UNCATEGORIZED_FILTER) {
        list = list.filter(row => !row.category);
      } else if (catFilter === NO_PRICE_FILTER) {
        list = list.filter(isIngredientMissingPackagePrice);
      } else if (catFilter !== 'all') {
        list = list.filter(row => row.category === catFilter);
      }
      if (tagFilter !== 'all') {
        list = list.filter(row => (row.tags || []).includes(tagFilter));
      }
    }

    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return list;

    return list.filter(
      row =>
        (row.ingredientName || row.displayName || row.productName || '')
          .toLowerCase()
          .includes(query) ||
        (row.productCode || '').toLowerCase().includes(query) ||
        (row.category || '').toLowerCase().includes(query) ||
        (row.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
        (row.manufacturer || '').toLowerCase().includes(query)
    );
  }, [rows, catFilter, tagFilter, debouncedSearch]);

  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · 전체 ${rows.length}개 · 관리 중 ${managedCount}개${discontinuedCount ? ` · 단종 ${discontinuedCount}개` : ''}`
      : rows.length > 0
        ? `제때 가격 파일 없음 · 메타 ${rows.length}개`
        : '제때 가격 파일이 없습니다 — 마스터 시드 적용 또는 가격파일 업로드 필요';

  return {
    activeCount: activeRows.length,
    managedCount,
    discontinuedCount,
    categoryCounts,
    mainCats,
    tagCounts,
    hashTags,
    originSuggestions,
    uncategorized,
    noPriceCount,
    issueRows,
    duplicateDiagnostics,
    duplicateGroupCount,
    unusedCategories,
    unusedTags,
    filtered,
    sub,
  };
}
