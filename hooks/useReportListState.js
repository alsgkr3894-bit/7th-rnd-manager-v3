import { useState, useEffect, useMemo, useRef } from 'react';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { clampInteger, asFiniteNumber } from '@/lib/ui/prop-guards';

const ITEMS_PER_PAGE = 10;
const REPORT_SORT_KEYS = new Set(['id', 'name', 'kind', 'createdAt']);

function safeReportKind(kind) {
  return asDisplayText(kind);
}

function reportSearchText(report) {
  return [
    asDisplayText(report?.name),
    asDisplayText(report?.period),
    asDisplayText(report?.author),
  ].join('');
}

export function useReportListState(reports) {
  const [kindFilter, setKindFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [newIds, setNewIds] = useState(new Set());
  const newIdsTimerRef = useRef(null);

  // URL 상태 복원 (page, sort, dir) + 새 보고서 하이라이트
  useEffect(() => {
    const url = new URL(window.location.href);
    const initialPage = clampInteger(url.searchParams.get('p') || 1, { min: 1, fallback: 1 });
    const sortParam = url.searchParams.get('sort');
    const dirParam = url.searchParams.get('dir');
    const newIdParam = url.searchParams.get('new');
    const newId = newIdParam ? clampInteger(newIdParam, { min: 1, fallback: null }) : null;
    if (initialPage > 1) setPage(initialPage);
    if (REPORT_SORT_KEYS.has(sortParam)) setSortKey(sortParam);
    if (dirParam === 'asc' || dirParam === 'desc') setSortDir(dirParam);
    if (newId && !Number.isNaN(newId)) {
      setNewIds(new Set([newId]));
      if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current);
      newIdsTimerRef.current = setTimeout(() => {
        setNewIds(new Set());
        newIdsTimerRef.current = null;
      }, 5000);
    }
    url.searchParams.delete('new');
    window.history.replaceState({}, '', url.toString());
    return () => {
      if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current);
    };
  }, []);

  // 정렬·페이지 변경 시 URL 갱신
  useEffect(() => {
    const url = new URL(window.location.href);
    if (page > 1) url.searchParams.set('p', page);
    else url.searchParams.delete('p');
    if (sortKey !== 'createdAt') url.searchParams.set('sort', sortKey);
    else url.searchParams.delete('sort');
    if (sortDir !== 'desc') url.searchParams.set('dir', sortDir);
    else url.searchParams.delete('dir');
    window.history.replaceState({}, '', url.toString());
  }, [page, sortKey, sortDir]);

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1);
  }, [kindFilter, search, favOnly, sortKey, sortDir]);

  const filtered = useMemo(
    () =>
      reports
        .filter(r => {
          if (kindFilter !== 'all' && safeReportKind(r.kind) !== kindFilter) return false;
          if (favOnly && !r.fav) return false;
          const q = asDisplayText(search).trim().toLowerCase();
          if (q && !reportSearchText(r).toLowerCase().includes(q)) return false;
          return true;
        })
        .sort((a, b) => {
          let valA = a[sortKey],
            valB = b[sortKey];
          if (sortKey === 'name' || sortKey === 'kind') {
            valA = asDisplayText(valA);
            valB = asDisplayText(valB);
            return sortDir === 'asc'
              ? valA.localeCompare(valB, 'ko')
              : valB.localeCompare(valA, 'ko');
          }
          if (!valA && !valB) return 0;
          if (!valA) return 1;
          if (!valB) return -1;
          const cmp = valA > valB ? 1 : valA < valB ? -1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        }),
    [reports, kindFilter, favOnly, search, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const list = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  function toggleSort(key) {
    if (!REPORT_SORT_KEYS.has(key)) return;
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return {
    kindFilter,
    setKindFilter,
    search,
    setSearch,
    favOnly,
    setFavOnly,
    page,
    setPage,
    sortKey,
    sortDir,
    newIds,
    filtered,
    totalPages,
    safePage,
    list,
    toggleSort,
  };
}
