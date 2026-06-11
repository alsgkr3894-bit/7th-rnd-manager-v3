import { MENU_CATEGORY } from '@/lib/menu-categories';

const PIZZA_USAGE_CATS = new Set([MENU_CATEGORY.PIZZA, MENU_CATEGORY.PERSONAL]);
const SIDE_USAGE_CATS = new Set([MENU_CATEGORY.SIDE]);

function normalizeMenuName(menu) {
  if (typeof menu === 'string') return menu.trim();
  return (menu?.menuName || '').trim();
}

function normalizeCategory(menu) {
  if (!menu || typeof menu === 'string') return '';
  return (menu.cat || menu.category || '').trim();
}

export function getUsageMenuCounts(menus = []) {
  const total = new Set();
  const pizza = new Set();
  const side = new Set();

  for (const menu of menus || []) {
    const menuName = normalizeMenuName(menu);
    if (!menuName) continue;

    const cat = normalizeCategory(menu);
    total.add(menuName);
    if (PIZZA_USAGE_CATS.has(cat)) pizza.add(menuName);
    if (SIDE_USAGE_CATS.has(cat)) side.add(menuName);
  }

  return { total: total.size, pizza: pizza.size, side: side.size };
}

export function getUsageRowsMenuCounts(rows = []) {
  return getUsageMenuCounts((rows || []).flatMap(row => row?.menus || []));
}
