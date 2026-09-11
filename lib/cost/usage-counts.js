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

/** 사용현황 맵 값에서 카테고리를 읽는다 — 기존 문자열 값과 신규 {category,sources} 값을 모두 지원. */
export function usageEntryCategory(v) {
  return typeof v === 'string' ? v : v?.category || '';
}

function normalizeIngredientKey(value) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 카테고리·제외메뉴·폐기 여부를 반영해 "실제로 쓰이는" 식자재 개수를 센다
 * (제품별 사용현황의 "미사용" 배지 = 전체 - 이 값).
 *
 * usageRows/unusedRows와 같은 기준(usageCat, excludedMenus, discontinued 제외)을 써야
 * "사용 재료 + 미사용 + 숨김 = 전체"가 카테고리를 바꿔도 항상 맞는다. 자유 검색어
 * (menuSearch)는 목록 표시용 임시 필터일 뿐이라 일부러 반영하지 않는다 — 반영하면
 * 검색어를 입력하는 순간 실제로 쓰이는 식자재까지 "미사용"으로 잘못 집계된다.
 */
export function countIngredientsWithQualifyingUsage(
  allMeta,
  usageMap,
  { usageCat = '전체', excludedMenus = new Set() } = {}
) {
  const byCode = usageMap?.byCode;
  const byName = usageMap?.byName;
  return (Array.isArray(allMeta) ? allMeta : []).filter(m => {
    if (!m || m.discontinued) return false;
    const code = m.productCode || '';
    const fromCode = (code && byCode?.get(code)) || new Map();
    const fromName = byName?.get(normalizeIngredientKey(m.ingredientName)) || new Map();
    const menuMap = new Map([...fromName, ...fromCode]);
    return hasQualifyingUsage(menuMap, { usageCat, excludedMenus });
  }).length;
}

/**
 * 단일 식자재가 이 필터(usageCat·excludedMenus)에서 "사용 중"인지 판정 — 배지 카운트와
 * usageRows/unusedRows가 반드시 이 함수 하나로 판정해야 개수가 어긋나지 않는다.
 */
export function hasQualifyingUsage(menuMap, { usageCat = '전체', excludedMenus = new Set() } = {}) {
  if (!(menuMap instanceof Map)) return false;
  for (const [menuName, v] of menuMap) {
    if (excludedMenus.has(menuName)) continue;
    const cat = usageEntryCategory(v);
    if (usageCat !== '전체' && cat !== usageCat) continue;
    return true;
  }
  return false;
}
