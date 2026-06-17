import {
  asDisplayText,
  buildLegacyToppingRows,
  buildToppingMasterRows,
} from '../_utils.js';

export function buildToppingSheet({
  menus,
  rawMap,
  masterByCode,
  menuAllergenMap,
  menuOrder,
  toppings,
  toppingAllergenMap,
}) {
  const masterRows = buildToppingMasterRows(toppings, toppingAllergenMap);
  const seen = new Set(
    masterRows
      .map(row => asDisplayText(row.menuCode) || asDisplayText(row.menuName))
      .filter(Boolean)
  );
  const legacyRows = buildLegacyToppingRows({
    menus,
    rawMap,
    masterByCode,
    menuAllergenMap,
    menuOrder,
  }).filter(row => {
    const key = asDisplayText(row.menuCode) || asDisplayText(row.menuName);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...masterRows, ...legacyRows];
}
