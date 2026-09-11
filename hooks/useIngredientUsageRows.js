import { useMemo } from 'react';
import { scopeLabelFor } from '@/lib/ingredient';
import { SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import {
  countIngredientsWithQualifyingUsage,
  getUsageMenuCounts,
  getUsageRowsMenuCounts,
  hasQualifyingUsage,
  usageEntryCategory,
} from '@/lib/cost/usage-counts';

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
          .filter(([menuName, v]) => {
            const cat = usageEntryCategory(v);
            return (
              !excludedMenus.has(menuName) &&
              (usageCat === '전체' || cat === usageCat) &&
              (!q || menuName.toLowerCase().includes(q))
            );
          })
          .map(([menuName, v]) => ({
            menuName,
            cat: usageEntryCategory(v),
            sources: v?.sources instanceof Set ? [...v.sources] : ['직접'],
          }))
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
        const name = m.ingredientName || m.productName || m.displayName || '';
        const fromCode = (code ? byCode.get(code) : null) || new Map();
        const fromName = byName.get(normStr(m.ingredientName || '')) || new Map();
        const menuMap = new Map([...fromName, ...fromCode]);
        // usageRows/배지와 같은 기준(usageCat·excludedMenus)으로 판정해야 "이 필터에서
        // 미사용"이 정확하다 — 원본 usage map에 항목이 있어도 이 필터에서 걸러지면 미사용.
        if (hasQualifyingUsage(menuMap, { usageCat, excludedMenus })) return null;
        const label = name || code;
        if (q && !label.toLowerCase().includes(q) && !code.toLowerCase().includes(q)) return null;
        const scope = code ? scopeLabelFor(typeMap, code) : m.scope || SCOPE_UNASSIGNED;
        return { code, name: label, scope, count: 0, menus: [] };
      })
      .filter(Boolean);
  }, [allMeta, menuSearch, typeMap, usageMap, usageCat, excludedMenus]);

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

  // "미사용" 배지(allMetaCount - totalUsedCount)가 카테고리를 바꿔도 그대로였던 버그 —
  // usageRows는 usageCat/excludedMenus/discontinued를 반영하는데 이 값은 그렇지 않아서,
  // 카테고리 필터를 걸면 "사용 재료"는 줄어드는데 "미사용"은 그대로라 더해도 전체 개수가
  // 안 맞았다. countIngredientsWithQualifyingUsage가 같은 기준을 적용한다.
  const totalUsedCount = useMemo(
    () => countIngredientsWithQualifyingUsage(allMeta, usageMap, { usageCat, excludedMenus }),
    [allMeta, usageMap, usageCat, excludedMenus]
  );

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
