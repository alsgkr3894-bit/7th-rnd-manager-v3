import { asDisplayText, buildLegacyToppingRows, buildToppingMasterRows } from '../_utils.js';

export function buildToppingSheet({
  menus,
  rawMap,
  masterByCode,
  menuAllergenMap,
  menuOrder,
  toppings,
  toppingAllergenMap,
  toppingOrder,
  nameOverrides,
}) {
  const masterRows = buildToppingMasterRows(
    toppings,
    toppingAllergenMap,
    toppingOrder,
    nameOverrides,
    menuAllergenMap,
    menus,
    masterByCode
  );
  const seen = new Set();
  masterRows.forEach(row => {
    [row.menuCode, row.linkedMenuCode, row.menuName]
      .map(value => asDisplayText(value))
      .filter(Boolean)
      .forEach(key => seen.add(key));
  });
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
