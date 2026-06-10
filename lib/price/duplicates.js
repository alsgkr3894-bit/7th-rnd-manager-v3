import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function priceProductCodeKey(productCode) {
  return asDisplayText(productCode).trim().toLowerCase();
}

export function buildPriceProductCodeDuplicateDiagnostics(rows = []) {
  const groupsByKey = new Map();
  asObjectArray(rows).forEach((row, index) => {
    const key = priceProductCodeKey(row?.productCode);
    if (!key) return;
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push({ row, index });
  });

  const groups = [...groupsByKey.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      const keep = items[items.length - 1];
      const remove = items.slice(0, -1);
      return {
        key,
        productCode: asDisplayText(keep.row?.productCode || items[0]?.row?.productCode),
        count: items.length,
        keepIndex: keep.index,
        keepName: asDisplayText(keep.row?.productName),
        removeIndexes: remove.map(item => item.index),
        removeNames: remove.map(item => asDisplayText(item.row?.productName)),
      };
    });
  const duplicateRows = groups.reduce((sum, group) => sum + Math.max(0, group.count - 1), 0);

  return {
    groups,
    groupCount: groups.length,
    duplicateRows,
    hasDuplicates: duplicateRows > 0,
  };
}

export function dedupePriceRowsByProductCode(rows = []) {
  const safeRows = asObjectArray(rows);
  const diagnostics = buildPriceProductCodeDuplicateDiagnostics(safeRows);
  if (!diagnostics.hasDuplicates) return { rows: safeRows, diagnostics };

  const keepIndexes = new Set(diagnostics.groups.map(group => group.keepIndex));
  const removeIndexes = new Set(diagnostics.groups.flatMap(group => group.removeIndexes));
  const dedupedRows = safeRows.filter((row, index) => {
    if (!priceProductCodeKey(row?.productCode)) return true;
    if (keepIndexes.has(index)) return true;
    return !removeIndexes.has(index);
  });

  return { rows: dedupedRows, diagnostics };
}

export function buildPriceRowMap(rows = []) {
  const { rows: effectiveRows, diagnostics } = dedupePriceRowsByProductCode(rows);
  const map = new Map();
  for (const row of effectiveRows) {
    const productCode = asDisplayText(row?.productCode);
    if (productCode) map.set(productCode, row);
  }
  return { map, diagnostics, rows: effectiveRows };
}
