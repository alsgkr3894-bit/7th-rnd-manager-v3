import { useState, useMemo } from 'react';
import { getMenuSubCategoryFromCode, parseCategoryFromCode } from '@/lib/cost/menu-price';
import { MENU_CATEGORY } from '@/lib/menu-categories';

// 피자 중분류는 메뉴코드(P-PM-…)가 기준이다 — 중분류 칸에 코드('PM')만 적어 둔 행도
// 표시(MenuMasterTableRow)와 같은 이름(프로모션)으로 걸러지게 코드 판정을 먼저 쓴다.
function rowSubCategory(row) {
  return (
    getMenuSubCategoryFromCode(row?.menuCode)?.label ||
    row?.subCategory ||
    parseCategoryFromCode(row?.menuCode).subCategory ||
    ''
  );
}

export function useMenuMasterFilters(rows, brandCats) {
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [subFilter, setSubFilter] = useState('all');
  const [search, setSearch] = useState('');
  // 숨김(hidden)은 단종과 별개인 임시 노출 제어 필드다 — 기본은 완전히 숨기고,
  // 필요할 때만 숨김 개수 배지를 눌러 잠깐 보이게 한다(원가마진표 showHidden과 동일 패턴).
  const [showHidden, setShowHidden] = useState(false);
  const hiddenCount = useMemo(() => rows.filter(r => r.hidden).length, [rows]);

  const visibleRows = useMemo(
    () => (showHidden ? rows : rows.filter(r => !r.hidden)),
    [rows, showHidden]
  );

  const statusFiltered = useMemo(
    () =>
      statusFilter === 'all' ? visibleRows : visibleRows.filter(r => r.status === statusFilter),
    [visibleRows, statusFilter]
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
    let list =
      statusFilter === 'all' ? visibleRows : visibleRows.filter(r => r.status === statusFilter);
    if (catFilter !== 'all') list = list.filter(r => (r.category || '').startsWith(catFilter));
    if (catFilter === MENU_CATEGORY.PIZZA && subFilter !== 'all')
      list = list.filter(r => rowSubCategory(r) === subFilter);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.menuCode || '').toLowerCase().includes(q) ||
          (r.menuName || '').toLowerCase().includes(q) ||
          rowSubCategory(r).toLowerCase().includes(q)
      );
    return list;
  }, [visibleRows, catFilter, subFilter, statusFilter, search]);

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
    visibleRows,
    showHidden,
    setShowHidden,
    hiddenCount,
  };
}
