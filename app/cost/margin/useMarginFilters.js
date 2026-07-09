'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebounce } from '@/hooks/useDebounce';
import { getMenuPriceCategories } from '@/lib/cost/menu-price';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '@/lib/cost/margin/platforms';
import { KEYS } from '@/lib/note/keys';

// costMap은 키 존재 여부로 "원가 데이터 있음"을 나타낸다 — 키가 없으면 0원이 아니라
// "원가 미입력"이므로 0으로 대체하면 안 된다(집계·정렬 모두 MarginRow의 getCostEntry와 동일 기준).
function readCostEntry(costMap, label) {
  if (!Object.prototype.hasOwnProperty.call(costMap || {}, label)) return null;
  const cost = Number(costMap[label]);
  return Number.isFinite(cost) ? cost : null;
}

export function useMarginFilters({ rows, activePlatform, discount, warnPct, critPct, viewMode }) {
  const [catFilter, setCatFilter] = useLocalStorage(KEYS.MARGIN_CAT_FILTER, '전체');
  const [sortKey, setSortKey] = useState('code');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [showHidden, setShowHidden] = useState(false);
  const [edgeFilter, setEdgeFilter] = useState(null);

  // 저장된 필터가 현재 행에 없는 카테고리면 '전체'로 되돌림
  useEffect(() => {
    if (catFilter === '전체' || !rows.length) return;
    const has = rows.some(r => {
      const cat = r.menuCategory || '기타';
      return cat === catFilter || (catFilter === '피자' && cat.startsWith('피자/'));
    });
    if (!has) setCatFilter('전체');
  }, [catFilter, rows, setCatFilter]);

  const cats = useMemo(() => {
    const set = new Set(rows.map(r => r.menuCategory || '기타'));
    const order = [...getMenuPriceCategories(), '기타'];
    return [
      '전체',
      ...[...set].sort((a, b) => {
        const ia = order.indexOf(a),
          ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    let result = showHidden ? rows : rows.filter(r => !r.hidden);
    if (catFilter !== '전체') {
      result = result.filter(r => {
        const cat = r.menuCategory || '기타';
        if (cat === catFilter) return true;
        if (catFilter === '피자' && cat.startsWith('피자/')) return true;
        return false;
      });
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        r =>
          (r.menuName || '').toLowerCase().includes(q) ||
          (r.menuCategory || '').toLowerCase().includes(q) ||
          (r.menuSubCategory || '').toLowerCase().includes(q) ||
          (r.menuSubCategoryCode || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, catFilter, debouncedSearch, showHidden]);

  const edgeFiltered = useMemo(() => {
    if (!edgeFilter) return filtered;
    const isDerived = r => String(r.id ?? '').startsWith('derived||');
    if (edgeFilter === 'base') return filtered.filter(r => !isDerived(r));
    return filtered.filter(r => isDerived(r) && String(r.id).split('||').pop() === edgeFilter);
  }, [filtered, edgeFilter]);

  const sizeLabels = useMemo(() => {
    const set = new Set();
    edgeFiltered.forEach(r =>
      r.sizes?.forEach(s => {
        if (s.label) set.add(s.label);
      })
    );
    const order = ['L', 'R', '단일', '단품', '세트'];
    return [...set].sort((a, b) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return ia !== -1 ? -1 : ib !== -1 ? 1 : a.localeCompare(b, 'ko');
    });
  }, [edgeFiltered]);

  const stats = useMemo(() => {
    if (!edgeFiltered.length) return null;
    let sum = 0,
      count = 0;
    let lowCostCount = 0,
      highCostCount = 0,
      goodMarginCount = 0,
      badMarginCount = 0;
    for (const r of edgeFiltered) {
      for (const s of r.sizes || []) {
        const cost = readCostEntry(r.costMap, s.label);
        if (cost == null) continue;
        const eff = applyDiscount(s.sellingPrice, discount);
        const net = calcNetRevenue(eff, activePlatform.fees, s.label);
        const m = calcPlatformMargin(cost, net);
        if (m == null) continue;
        sum += m;
        count++;
        if (m < warnPct) lowCostCount++;
        if (m >= critPct) highCostCount++;
        const margin = 100 - m;
        if (margin >= 100 - warnPct) goodMarginCount++;
        if (margin < 100 - critPct) badMarginCount++;
      }
    }
    if (!count) return null;
    return { avg: sum / count, lowCostCount, highCostCount, goodMarginCount, badMarginCount };
  }, [edgeFiltered, activePlatform, discount, warnPct, critPct]);

  const handleSort = useCallback(
    key => {
      if (sortKey === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return edgeFiltered;

    if (sortKey === 'code') {
      return [...edgeFiltered].sort((a, b) => {
        const ra = getMenuCodeRank(a.menuCode);
        const rb = getMenuCodeRank(b.menuCode);
        if (ra !== rb) return sortDir === 'asc' ? ra - rb : rb - ra;
        const ca = (a.menuCode || '~~~').toLowerCase();
        const cb = (b.menuCode || '~~~').toLowerCase();
        const c = ca.localeCompare(cb, 'ko');
        return sortDir === 'asc' ? c : -c;
      });
    }

    function getVal(r) {
      if (sortKey === 'name') return (r.menuName || '').toLowerCase();
      if (sortKey === 'cat') return (r.menuCategory || '기타').toLowerCase();
      if (sortKey === 'sub') {
        return `${r.menuSubCategoryCode || ''} ${r.menuSubCategory || ''}`.trim().toLowerCase();
      }
      const ul = sortKey.lastIndexOf('_');
      if (ul === -1) return 0;
      const type = sortKey.slice(0, ul);
      const size = sortKey.slice(ul + 1);
      if (type === 'cost') return r.costMap?.[size] ?? Infinity;
      const sv = r.sizes?.find(s => s.label === size);
      if (type === 'price') return sv?.sellingPrice ?? Infinity;
      const eff = applyDiscount(sv?.sellingPrice, discount);
      const net = calcNetRevenue(eff, activePlatform.fees, size);
      if (type === 'net') return net ?? Infinity;
      if (type === 'rate') {
        const rateCost = readCostEntry(r.costMap, size);
        if (rateCost == null) return Infinity;
        const cr = calcPlatformMargin(rateCost, net);
        if (cr == null) return Infinity;
        return viewMode === 'margin' ? 100 - cr : cr;
      }
      return 0;
    }

    return [...edgeFiltered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va === Infinity && vb === Infinity) return 0;
      if (va === Infinity) return 1;
      if (vb === Infinity) return -1;
      if (typeof va === 'string') {
        const c = va.localeCompare(vb, 'ko');
        return sortDir === 'asc' ? c : -c;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [edgeFiltered, sortKey, sortDir, discount, activePlatform, viewMode]);

  const hiddenCount = useMemo(() => rows.filter(r => r.hidden).length, [rows]);

  return {
    catFilter,
    setCatFilter,
    sortKey,
    sortDir,
    search,
    setSearch,
    showHidden,
    setShowHidden,
    edgeFilter,
    setEdgeFilter,
    cats,
    filtered,
    edgeFiltered,
    sizeLabels,
    stats,
    handleSort,
    sortedFiltered,
    hiddenCount,
  };
}
