import { useEffect, useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePagination } from '@/hooks/usePagination';
import { SCOPE, DISCONTINUED_FILTER, UNCATEGORIZED_FILTER } from '@/lib/ingredient/constants';
import { KEYS } from '@/lib/note/keys';

export function useIngredientCatalogView(rows) {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [catFilter, setCatFilter] = useLocalStorage(
    KEYS.INGREDIENT_LIST_CAT_FILTER,
    'all',
    value => (typeof value === 'string' && value ? value : 'all')
  );
  const [tagFilter, setTagFilter] = useState('all');
  const [sort, setSort] = useState('default');

  const filtered = useMemo(() => {
    let list;
    if (catFilter === DISCONTINUED_FILTER) {
      list = rows.filter(r => r.discontinued);
    } else {
      list = rows.filter(r => !r.discontinued && !r.excluded);
      if (scopeFilter !== 'all') list = list.filter(r => r.scope === scopeFilter);
      if (catFilter === UNCATEGORIZED_FILTER) list = list.filter(r => !r.category);
      else if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
      if (tagFilter !== 'all') list = list.filter(r => (r.tags || []).includes(tagFilter));
    }
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
          (r.productCode || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (r.manufacturer || '').toLowerCase().includes(q)
      );
    if (sort === 'name')
      return [...list].sort((a, b) =>
        (a.ingredientName || a.displayName || '').localeCompare(
          b.ingredientName || b.displayName || '',
          'ko'
        )
      );
    if (sort === 'category')
      return [...list].sort((a, b) => {
        const ca = a.category || 'ㅎ',
          cb = b.category || 'ㅎ';
        if (ca !== cb) return ca.localeCompare(cb, 'ko');
        return (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko');
      });
    if (sort === 'price-desc')
      return [...list].sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
    if (sort === 'price-asc')
      return [...list].sort((a, b) => (a.unitPrice || 0) - (b.unitPrice || 0));
    return list;
  }, [rows, scopeFilter, catFilter, tagFilter, search, sort]);

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 60);

  useEffect(() => {
    goTo(1);
  }, [search, scopeFilter, catFilter, tagFilter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    search,
    setSearch,
    scopeFilter,
    setScopeFilter,
    catFilter,
    setCatFilter,
    tagFilter,
    setTagFilter,
    sort,
    setSort,
    filtered,
    page,
    goTo,
    totalPages,
    paged,
    total,
  };
}
