function readPositivePrice(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function getIngredientPackagePrice(row = {}) {
  const safeRow = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  for (const key of ['priceWithTax', 'priceOverride', 'price']) {
    const price = readPositivePrice(safeRow[key]);
    if (price != null) return price;
  }
  return null;
}

export function hasIngredientPackagePrice(row) {
  return getIngredientPackagePrice(row) != null;
}

export function isIngredientMissingPackagePrice(row) {
  const safeRow = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  if (safeRow.discontinued || safeRow.excluded) return false;
  return !hasIngredientPackagePrice(safeRow);
}

export function countMissingIngredientPackagePrices(rows) {
  return Array.isArray(rows) ? rows.filter(isIngredientMissingPackagePrice).length : 0;
}
