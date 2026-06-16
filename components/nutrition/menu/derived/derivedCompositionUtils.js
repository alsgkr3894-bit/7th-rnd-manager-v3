import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';
import { resolveNutritionGroup, NUTRITION_GROUP_ORDER } from '@/lib/nutrition/menu-group';

export const EMPTY_UNIT_PRICE_MAP = new Map();

export function asAmountMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function amountText(amounts, code) {
  const row = asAmountMap(amounts)[code];
  if (!row || typeof row !== 'object') return '';
  const l = asDisplayText(row.L);
  const r = asDisplayText(row.R);
  if (!l && !r) return '';
  return `L ${l || '-'}g / R ${r || '-'}g`;
}

export function buildMasterByCode(menuMasters) {
  return Object.fromEntries(
    (Array.isArray(menuMasters) ? menuMasters : [])
      .map(row => [asDisplayText(row?.menuCode), row])
      .filter(([menuCode]) => menuCode)
  );
}

export function buildMenuByCode(menus) {
  return Object.fromEntries(
    (Array.isArray(menus) ? menus : [])
      .map(row => [asDisplayText(row?.menuCode), row])
      .filter(([menuCode]) => menuCode)
  );
}

export function buildIngredientMetaByCode(ingredients) {
  return Object.fromEntries(
    (Array.isArray(ingredients) ? ingredients : [])
      .map(row => [asDisplayText(row?.productCode), row])
      .filter(([code]) => code)
  );
}

export function buildIngredientOptions(ingredients) {
  const byCode = new Map();
  (Array.isArray(ingredients) ? ingredients : []).forEach(row => {
    const productCode = asDisplayText(row?.productCode);
    if (!productCode) return;
    byCode.set(productCode, {
      ...row,
      productCode,
      ingredientName: asDisplayText(
        row.ingredientName || row.displayName || row.productName || productCode
      ),
    });
  });
  return [...byCode.values()];
}

export function filterDerivedCompositions({
  compositions,
  searchText,
  menuByCode,
  ingredientMetaByCode,
}) {
  const safeCompositions = Array.isArray(compositions) ? compositions : [];
  const normalizedSearch = asDisplayText(searchText).trim().toLowerCase();
  if (!normalizedSearch) return safeCompositions;

  return safeCompositions.filter(comp => {
    const baseMenu = menuByCode[asDisplayText(comp.baseMenuCode)];
    const ingredientNames = asStringArray(comp.ingredientCodes)
      .map(code => ingredientMetaByCode[code])
      .map(row => asDisplayText(row?.ingredientName || row?.productCode))
      .filter(Boolean);

    return [
      comp.menuName,
      comp.menuCode,
      comp.baseMenuCode,
      baseMenu?.menuName,
      baseMenu?.menuCode,
      ...ingredientNames,
    ]
      .map(value => asDisplayText(value).toLowerCase())
      .some(value => value.includes(normalizedSearch));
  });
}

export function groupDerivedCompositions({ compositions, menuByCode, masterByCode }) {
  const buckets = {};
  NUTRITION_GROUP_ORDER.forEach(group => {
    buckets[group] = [];
  });

  (Array.isArray(compositions) ? compositions : []).forEach(comp => {
    const baseMenu = menuByCode[asDisplayText(comp.baseMenuCode)] || {
      menuCode: comp.baseMenuCode,
      category: '',
    };
    const group = resolveNutritionGroup(baseMenu, masterByCode);
    buckets[group].push(comp);
  });

  return NUTRITION_GROUP_ORDER.filter(group => buckets[group].length > 0).map(group => ({
    group,
    items: buckets[group],
  }));
}
