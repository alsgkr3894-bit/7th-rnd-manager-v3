import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { normStr } from '@/lib/nutrition/allergen/matrix';

export function filterAllergenIngredients(ingredients) {
  return asObjectArray(ingredients).filter(
    ingredient =>
      asStringArray(ingredient.allergens).length && !ingredient.discontinued && !ingredient.excluded
  );
}

export function filterIngredientRows(allergenIngredients, search) {
  const query = asDisplayText(search).toLowerCase().trim();
  if (!query) return allergenIngredients;
  return allergenIngredients.filter(ingredient => {
    const ingredientAllergens = asStringArray(ingredient.allergens);
    const allergenNames = ALLERGEN_SEED.filter(allergen =>
      ingredientAllergens.includes(allergen.allergenCode)
    )
      .map(allergen => asDisplayText(allergen.allergenName))
      .join(' ');
    return (
      asDisplayText(ingredient.ingredientName).toLowerCase().includes(query) ||
      asDisplayText(ingredient.productCode).toLowerCase().includes(query) ||
      allergenNames.toLowerCase().includes(query)
    );
  });
}

export function orderAllergens(allergenOrder, menuMatrixAll) {
  const safeOrder = asStringArray(allergenOrder);
  if (safeOrder.length) {
    const rank = new Map(safeOrder.map((code, index) => [code, index]));
    return [...ALLERGEN_SEED].sort((a, b) => {
      const aCode = asDisplayText(a.allergenCode);
      const bCode = asDisplayText(b.allergenCode);
      const aRank = rank.has(aCode) ? rank.get(aCode) : Infinity;
      const bRank = rank.has(bCode) ? rank.get(bCode) : Infinity;
      if (aRank !== bRank) return aRank - bRank;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }

  const frequency = new Map();
  for (const row of menuMatrixAll) {
    const codes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
    for (const code of codes) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  }
  return [...ALLERGEN_SEED].sort((a, b) => {
    const aFrequency = frequency.get(asDisplayText(a.allergenCode)) ?? 0;
    const bFrequency = frequency.get(asDisplayText(b.allergenCode)) ?? 0;
    if (bFrequency !== aFrequency) return bFrequency - aFrequency;
    return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
  });
}

export function buildIngredientByKey(allergenIngredients) {
  const map = new Map();
  for (const ingredient of allergenIngredients) {
    const productCode = asDisplayText(ingredient.productCode);
    if (productCode) map.set(`code:${productCode}`, ingredient);
    const nameKey = normStr(ingredient.ingredientName);
    if (nameKey) map.set(`name:${nameKey}`, ingredient);
  }
  return map;
}

export function filterMenuMatrix(menuMatrixAll, search) {
  const query = asDisplayText(search).toLowerCase().trim();
  if (!query) return menuMatrixAll;
  return menuMatrixAll.filter(row => {
    const allergenCodes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
    return (
      asDisplayText(row.menuName).toLowerCase().includes(query) ||
      asDisplayText(row.crust).toLowerCase().includes(query) ||
      ALLERGEN_SEED.filter(allergen => allergenCodes.has(allergen.allergenCode)).some(allergen =>
        asDisplayText(allergen.allergenName).toLowerCase().includes(query)
      )
    );
  });
}

export function buildMenuListForOrder(menuMatrixAll) {
  const seen = new Set();
  const out = [];
  for (const row of menuMatrixAll) {
    const menuCode = asDisplayText(row.menuCode);
    if (!menuCode || seen.has(menuCode)) continue;
    seen.add(menuCode);
    out.push({ key: menuCode, label: asDisplayText(row.originalMenuName ?? row.menuName) });
  }
  return out;
}

export function buildAllergenListForOrder(orderedAllergens) {
  return orderedAllergens
    .map(allergen => ({
      key: asDisplayText(allergen.allergenCode),
      label: asDisplayText(allergen.allergenName),
    }))
    .filter(item => item.key);
}

export function buildMenuNameEditMenus(menuListForOrder) {
  return menuListForOrder
    .map(menu => ({ menuCode: asDisplayText(menu.key), menuName: asDisplayText(menu.label) }))
    .filter(menu => menu.menuCode);
}

export function buildAllergenCsvRows(menuMatrix, orderedAllergens) {
  const headers = [
    '메뉴명',
    '크러스트',
    ...orderedAllergens.map(a => asDisplayText(a.allergenName)),
  ];
  const rows = menuMatrix.map(row => {
    const allergenCodes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
    return [
      asDisplayText(row.menuName),
      asDisplayText(row.crust),
      ...orderedAllergens.map(allergen =>
        allergenCodes.has(asDisplayText(allergen.allergenCode)) ? '●' : ''
      ),
    ];
  });
  return [headers, ...rows];
}
