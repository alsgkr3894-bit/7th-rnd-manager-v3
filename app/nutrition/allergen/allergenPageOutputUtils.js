import { asDisplayText } from '@/lib/ui/prop-guards';

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
