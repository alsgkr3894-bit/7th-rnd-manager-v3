import { useState, useMemo } from 'react';

export function useMenuMasterFilters(rows, brandCats) {
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [subFilter, setSubFilter] = useState('all');
  const [search, setSearch] = useState('');

  const statusFiltered = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter)),
    [rows, statusFilter]
  );

  const displayCategories = useMemo(() => {
    if (brandCats.length > 0) return brandCats;
    return [...new Set(rows.map(r => r.category).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'ko')
    );
  }, [rows, brandCats]);

  const catCounts = useMemo(() => {
    const m = { all: statusFiltered.length };
    displayCategories.forEach(c => {
      m[c] = statusFiltered.filter(r => (r.category || '').startsWith(c)).length;
    });
    return m;
  }, [statusFiltered, displayCategories]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter);
    if (catFilter !== 'all') list = list.filter(r => (r.category || '').startsWith(catFilter));
    if (catFilter === '피자' && subFilter !== 'all')
      list = list.filter(r => r.subCategory === subFilter);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.menuCode || '').toLowerCase().includes(q) ||
          (r.menuName || '').toLowerCase().includes(q) ||
          (r.subCategory || '').toLowerCase().includes(q)
      );
    return list;
  }, [rows, catFilter, subFilter, statusFilter, search]);

  return {
    catFilter,
    setCatFilter,
    statusFilter,
    setStatusFilter,
    subFilter,
    setSubFilter,
    search,
    setSearch,
    statusFiltered,
    displayCategories,
    catCounts,
    filtered,
  };
}
