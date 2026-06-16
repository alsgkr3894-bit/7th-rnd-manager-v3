import { getUsageMenuCounts, getUsageRowsMenuCounts } from '@/lib/cost/usage-counts';

export const TIER_LABELS = ['많이 쓰는 재료 (8개 이상)', '보통 (4–7개)', '적게 쓰는 재료 (1–3개)'];
export const USAGE_CATS = ['전체', '피자', '사이드', '1인피자'];
export const USAGE_MENU_PREVIEW_LIMIT = 4;

export const USAGE_CAT_COLORS = {
  피자: { bg: '#EFF6FF', color: '#1D4ED8' },
  '1인피자': { bg: '#FFF7ED', color: '#C2410C' },
  사이드: { bg: '#F0FDF4', color: '#15803D' },
};

export function usageNameKey(value) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function getUsageTier(count) {
  if (count >= 8) return 0;
  if (count >= 4) return 1;
  return 2;
}

export function buildIngredientUsageRows({ rows, usageMap, usageCat }) {
  const { byCode = new Map(), byName = new Map() } = usageMap || {};

  return rows
    .map((row, index) => {
      const code = row.meta?.productCode || row.productCode || '';
      const name = row.masterName || row.productName || '';

      const fromCode = (code ? byCode.get(code) : null) || new Map();
      const fromMaster = byName.get(usageNameKey(row.masterName || '')) || new Map();
      const fromProduct = byName.get(usageNameKey(row.productName || '')) || new Map();
      const menuMap = new Map([...fromProduct, ...fromMaster, ...fromCode]);

      if (!menuMap.size) return { code, name, count: 0, menus: [] };

      const menus = [...menuMap.entries()]
        .filter(([, cat]) => usageCat === '전체' || cat === usageCat)
        .map(([menuName, cat]) => ({ menuName, cat }))
        .sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));
      const menuCounts = getUsageMenuCounts(menus);

      return {
        uid: code || `_idx_${index}`,
        code,
        name,
        scope: row.scope || null,
        count: menuCounts.total,
        pizzaCount: menuCounts.pizza,
        sideCount: menuCounts.side,
        menus,
      };
    })
    .filter(row => row.count > 0);
}

export function sortIngredientUsageRows(rows, usageSort) {
  const sorted = [...rows];
  if (usageSort === 'count_desc') {
    sorted.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
  } else if (usageSort === 'count_asc') {
    sorted.sort((a, b) => a.count - b.count || a.name.localeCompare(b.name, 'ko'));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  return sorted;
}

export function getUsageRowsSummary(rows) {
  return getUsageRowsMenuCounts(rows);
}

export function shouldShowUsageTier({ rows, index, usageSort }) {
  const byCount = usageSort === 'count_desc' || usageSort === 'count_asc';
  if (!byCount) return false;
  return index === 0 || getUsageTier(rows[index - 1].count) !== getUsageTier(rows[index].count);
}

export function usageCountBadgeStyle(count) {
  return {
    background: count >= 8 ? '#DBEAFE' : count >= 4 ? '#D1FAE5' : 'var(--surface-2)',
    color: count >= 8 ? '#1D4ED8' : count >= 4 ? '#065F46' : 'var(--text-2)',
  };
}
