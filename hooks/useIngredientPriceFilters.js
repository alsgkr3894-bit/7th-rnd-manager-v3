import { useState, useMemo } from 'react';
import { sortMainCategories } from '@/lib/ingredient';

/**
 * 식자재 단가 목록 필터 상태 훅.
 * @param {object[]} rows - buildIngredientPriceRows 결과
 */
export function useIngredientPriceFilters(rows) {
  const [search, setSearch] = useState('');
  const [taxFilter, setTaxFilter] = useState('all');
  const [deltaFilter, setDeltaFilter] = useState('all');

  const mainCats = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return sortMainCategories(Array.from(set));
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (taxFilter !== 'all') list = list.filter(r => r.taxType === taxFilter);
    if (deltaFilter === 'up') list = list.filter(r => r.priceDelta > 0);
    if (deltaFilter === 'down') list = list.filter(r => r.priceDelta < 0);
    if (deltaFilter === 'new') list = list.filter(r => r.isNew);
    if (deltaFilter === 'same')
      list = list.filter(r => r.priceDelta === 0 || r.priceDelta == null);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.productName || '').toLowerCase().includes(q) ||
          (r.productCode || '').toLowerCase().includes(q) ||
          (r.masterName || '').toLowerCase().includes(q)
      );
    return list;
  }, [rows, taxFilter, deltaFilter, search]);

  return { search, setSearch, taxFilter, setTaxFilter, deltaFilter, setDeltaFilter, mainCats, filtered };
}
