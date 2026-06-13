import { useMemo } from 'react';
import { scopeLabelFor } from '@/lib/ingredient';
import { SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { getUsageMenuCounts, getUsageRowsMenuCounts } from '@/lib/cost/usage-counts';

function normStr(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '');
}

const keyOf = r => r.code || r.name;

/**
 * 식자재 사용현황 usageRows/unusedRows/displayRows 계산 훅.
 */
export function useIngredientUsageRows({
  allMeta,
  usageMap,
  typeMap,
  usageCat,
  menuSearch,
  sortKey,
  sortDir,
  showUnused,
  showHidden,
  onlyOne,
  hidden,
  excludedMenus,
}) {
  const usageRows = useMemo(() => {
    const { byCode, byName } = usageMap;
    const q = menuSearch.trim().toLowerCase();
    return allMeta
      .filter(m => !m.discontinued)
      .map(m => {
        const code = m.productCode || '';
        const dispName = m.ingredientName || '';

        const fromCode = (code ? byCode.get(code) : null) || new Map();
        const fromMaster = byName.get(normStr(dispName)) || new Map();
        const menuMap = new Map([...fromMaster, ...fromCode]);
        if (!menuMap.size) return null;

        const menus = [...menuMap.entries()]
          .filter(
            ([menuName, cat]) =>
              !excludedMenus.has(menuName) &&
              (usageCat === '전체' || cat === usageCat) &&
              (!q || menuName.toLowerCase().includes(q))
          )
          .map(([menuName, cat]) => ({ menuName, cat }))
          .sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));
        if (!menus.length) return null;

        const scope = code ? scopeLabelFor(typeMap, code) : m.scope || SCOPE_UNASSIGNED;
        const menuCounts = getUsageMenuCounts(menus);
        return {
          code,
          name: dispName,
          scope,
          count: menuCounts.total,
          pizzaCount: menuCounts.pizza,
          sideCount: menuCounts.side,
          menus,
        };
      })
      .filter(Boolean);
  }, [allMeta, usageMap, usageCat, menuSearch, typeMap, excludedMenus]);

  const unusedRows = useMemo(() => {
    const { byCode, byName } = usageMap;
    const q = menuSearch.trim().toLowerCase();
    return allMeta
      .filter(m => m && !m.discontinued)
      .map(m => {
        const code = m.productCode || '';
        const name = m.ingredientName || '';
        const fromCode = (code ? byCode.get(code) : null) || new Map();
        const fromName = byName.get(normStr(name)) || new Map();
        if (fromCode.size > 0 || fromName.size > 0) return null;
        if (q && !name.toLowerCase().includes(q) && !code.toLowerCase().includes(q)) return null;
        const scope = code ? scopeLabelFor(typeMap, code) : m.scope || SCOPE_UNASSIGNED;
        return { code, name, scope, count: 0, menus: [] };
      })
      .filter(Boolean);
  }, [allMeta, menuSearch, typeMap, usageMap]);

  const sorted = useMemo(() => {
    const arr = [...(showUnused ? unusedRows : usageRows)];
    if (sortKey === 'count') {
      arr.sort(
        (a, b) =>
          (sortDir === 'asc' ? a.count - b.count : b.count - a.count) ||
          a.name.localeCompare(b.name, 'ko')
      );
    } else {
      arr.sort((a, b) => {
        const c = a.name.localeCompare(b.name, 'ko');
        return sortDir === 'asc' ? c : -c;
      });
    }
    return arr;
  }, [showUnused, unusedRows, usageRows, sortKey, sortDir]);

  const nonHidden = useMemo(
    () => usageRows.filter(r => !hidden.has(keyOf(r))),
    [usageRows, hidden]
  );
  const hiddenCount = usageRows.length - nonHidden.length;
  const oneCount = useMemo(() => nonHidden.filter(r => r.count === 1).length, [nonHidden]);

  const displayRows = useMemo(() => {
    let arr = sorted;
    if (onlyOne && !showUnused) arr = arr.filter(r => r.count === 1);
    arr = showUnused
      ? arr
      : showHidden
        ? arr.filter(r => hidden.has(keyOf(r)))
        : arr.filter(r => !hidden.has(keyOf(r)));
    return arr;
  }, [sorted, onlyOne, showHidden, showUnused, hidden]);

  const menuCounts = useMemo(() => getUsageRowsMenuCounts(displayRows), [displayRows]);

  const totalUsedCount = useMemo(() => {
    const { byCode, byName } = usageMap;
    return allMeta.filter(m => {
      const fromCode = (m.productCode ? byCode.get(m.productCode) : null) || new Map();
      const fromName = byName.get(normStr(m.ingredientName)) || new Map();
      return fromCode.size > 0 || fromName.size > 0;
    }).length;
  }, [allMeta, usageMap]);

  return {
    usageRows,
    unusedRows,
    nonHidden,
    displayRows,
    hiddenCount,
    oneCount,
    menuCounts,
    totalUsedCount,
  };
}
