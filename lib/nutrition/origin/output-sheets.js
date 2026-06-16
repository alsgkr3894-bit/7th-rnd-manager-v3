import { getMenuCodeRank } from '@/lib/menu-categories';
import { applyIngredientName } from '@/lib/nutrition/ingredient-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import {
  formatStoreDisplayItem,
  formatStoreOriginCountry,
} from '@/lib/nutrition/origin/store-display-format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const DELIVERY_GROUPS = ['피자', '사이드'];

export function normalizeOriginItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of asObjectArray(items)) {
    const displayName = asDisplayText(item.displayName);
    const country = asDisplayText(item.country);
    const key = `${displayName}||${country}`;
    if (!country || seen.has(key)) continue;
    seen.add(key);
    out.push({ displayName, country });
  }
  return out;
}

export function formatOriginCountries(items) {
  const safeItems = normalizeOriginItems(items);
  if (safeItems.length <= 1) return safeItems[0]?.country || '';
  return safeItems
    .map(item => {
      const displayName = asDisplayText(item.displayName);
      return displayName ? `${displayName}:${item.country}` : item.country;
    })
    .filter(Boolean)
    .join(', ');
}

function makeMenuRank(menuOrder = []) {
  return new Map(
    (Array.isArray(menuOrder) ? menuOrder : [])
      .map((key, index) => [asDisplayText(key), index])
      .filter(([key]) => key)
  );
}

function menuRankValue(menu, rank) {
  const code = asDisplayText(menu?.menuCode);
  const name = asDisplayText(menu?.menuName);
  if (rank.has(code)) return rank.get(code);
  if (rank.has(name)) return rank.get(name);
  return Infinity;
}

function deliveryGroupRank(group) {
  const index = DELIVERY_GROUPS.indexOf(group);
  return index === -1 ? DELIVERY_GROUPS.length : index;
}

function sortMenuRefs(menuRefs, menuOrder = []) {
  const rank = makeMenuRank(menuOrder);
  return [...asObjectArray(menuRefs)].sort(
    (a, b) =>
      menuRankValue(a, rank) - menuRankValue(b, rank) ||
      deliveryGroupRank(a.group) - deliveryGroupRank(b.group) ||
      getMenuCodeRank(asDisplayText(a.menuCode)) - getMenuCodeRank(asDisplayText(b.menuCode)) ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
  );
}

function resolveDeliveryGroup({ menuCode, menuName, category }) {
  return resolveNutritionGroup({ menuCode, menuName, category }) === '피자' ? '피자' : '사이드';
}

export function buildOriginStoreSheet(origins, menuOrder = [], ingredientOverrides = {}) {
  const map = new Map();
  for (const row of asObjectArray(origins)) {
    const ingredientName = applyIngredientName(
      asDisplayText(row.ingredientName),
      ingredientOverrides
    );
    for (const item of asObjectArray(row.items)) {
      const displayName = asDisplayText(item.displayName);
      const country = asDisplayText(item.country);
      const key = `${displayName}||${country}`;
      if (!map.has(key)) {
        map.set(key, {
          rawDisplayName: displayName,
          rawOriginCountry: country,
          ingredientNames: [],
          menuRefs: new Map(),
        });
      }
      const entry = map.get(key);
      if (ingredientName && !entry.ingredientNames.includes(ingredientName)) {
        entry.ingredientNames.push(ingredientName);
      }
      for (const { menuCode, menuName, category } of asObjectArray(row.menuCodes)) {
        const safeMenuCode = asDisplayText(menuCode);
        const safeMenuName = asDisplayText(menuName);
        const menuKey = safeMenuCode || safeMenuName;
        if (!menuKey) continue;
        entry.menuRefs.set(menuKey, {
          menuCode: safeMenuCode,
          menuName: safeMenuName || safeMenuCode,
          category,
          group: resolveDeliveryGroup({ menuCode: safeMenuCode, menuName: safeMenuName, category }),
        });
      }
    }
  }
  return [...map.values()]
    .map(entry => ({
      ...entry,
      displayName: formatStoreDisplayItem(entry.rawDisplayName, entry.ingredientNames),
      originCountry: formatStoreOriginCountry(entry.rawDisplayName, entry.rawOriginCountry),
      menus: sortMenuRefs([...entry.menuRefs.values()], menuOrder).map(menu => menu.menuName),
    }))
    .sort((a, b) =>
      asDisplayText(a.rawDisplayName).localeCompare(asDisplayText(b.rawDisplayName), 'ko')
    );
}

export function buildOriginFridgeSheet(origins, ingredientOverrides = {}) {
  return asObjectArray(origins)
    .map(row => {
      const items = normalizeOriginItems(row.items);
      return {
        ingredientName: applyIngredientName(asDisplayText(row.ingredientName), ingredientOverrides),
        items,
        itemText: items
          .map(item => asDisplayText(item.displayName))
          .filter(Boolean)
          .join(', '),
        originText: formatOriginCountries(items),
      };
    })
    .sort((a, b) =>
      asDisplayText(a.ingredientName).localeCompare(asDisplayText(b.ingredientName), 'ko')
    );
}

export function buildOriginDeliverySheet(origins, ingredientOverrides = {}, menuOrder = []) {
  const menuMap = new Map();
  for (const row of asObjectArray(origins)) {
    const inner = formatOriginCountries(row.items);
    const ingredientName = applyIngredientName(
      asDisplayText(row.ingredientName),
      ingredientOverrides
    );
    const ingredientText = `${ingredientName}(${inner})`;
    for (const { menuCode, menuName, category } of asObjectArray(row.menuCodes)) {
      const safeMenuCode = asDisplayText(menuCode);
      const safeMenuName = asDisplayText(menuName);
      const key = safeMenuCode || safeMenuName;
      if (!key) continue;
      if (!menuMap.has(key)) {
        menuMap.set(key, {
          group: resolveDeliveryGroup({ menuCode: safeMenuCode, menuName: safeMenuName, category }),
          menuCode: key,
          menuName: safeMenuName || safeMenuCode,
          parts: [],
        });
      }
      const entry = menuMap.get(key);
      if (!entry.parts.includes(ingredientText)) entry.parts.push(ingredientText);
    }
  }
  const rank = makeMenuRank(menuOrder);
  return [...menuMap.values()].sort(
    (a, b) =>
      menuRankValue(a, rank) - menuRankValue(b, rank) ||
      deliveryGroupRank(a.group) - deliveryGroupRank(b.group) ||
      getMenuCodeRank(asDisplayText(a.menuCode)) - getMenuCodeRank(asDisplayText(b.menuCode)) ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
  );
}

export function buildOriginStatementSheet(origins, ingredientOverrides = {}) {
  const entries = [];
  for (const row of asObjectArray(origins)) {
    const items = asObjectArray(row.items);
    if (!items.length) continue;
    const byDisplay = new Map();
    for (const item of items) {
      const displayName = asDisplayText(item.displayName) || asDisplayText(row.ingredientName);
      if (!byDisplay.has(displayName)) byDisplay.set(displayName, []);
      const countries = byDisplay.get(displayName);
      const country = asDisplayText(item.country);
      if (country && !countries.includes(country)) countries.push(country);
    }
    const breakdown = [...byDisplay.entries()]
      .map(
        ([displayName, countries]) =>
          `${displayName} : ${countries.join(', ')}${countries.length > 1 ? ' 섞음' : ''}`
      )
      .join(', ');
    entries.push({
      name: applyIngredientName(asDisplayText(row.ingredientName), ingredientOverrides),
      breakdown,
    });
  }

  const merged = new Map();
  for (const entry of entries) {
    if (!entry.breakdown) continue;
    if (!merged.has(entry.breakdown)) merged.set(entry.breakdown, []);
    const names = merged.get(entry.breakdown);
    if (!names.includes(entry.name)) names.push(entry.name);
  }

  return [...merged.entries()]
    .map(([breakdown, names]) => {
      const sorted = [...names].sort((a, b) =>
        asDisplayText(a).localeCompare(asDisplayText(b), 'ko')
      );
      return { names: sorted.join(', '), breakdown, sortKey: sorted[0] || '' };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ko'));
}
