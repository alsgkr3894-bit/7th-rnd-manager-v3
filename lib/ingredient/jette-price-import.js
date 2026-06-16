import { simplifyIngredientName } from '@/lib/normalize';

export function normalizeJetteProductCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function cleanText(value) {
  return String(value ?? '').trim();
}

export function getJettePriceDisplayName(row) {
  const productName = cleanText(row?.productName || row?.displayName);
  return simplifyIngredientName(productName) || productName;
}

export function buildIngredientDraftFromJettePrice(row) {
  const priceWithTax = Number(row?.priceWithTax);
  return {
    productCode: cleanText(row?.productCode),
    ingredientName: getJettePriceDisplayName(row),
    taxType: cleanText(row?.taxType) || '과세',
    temperature: cleanText(row?.temperature),
    priceOverride: Number.isFinite(priceWithTax) && priceWithTax >= 0 ? String(priceWithTax) : '',
  };
}

export function filterJettePriceRows(rows, query, options = {}) {
  const term = cleanText(query).toLowerCase();
  if (!term) return [];

  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 12;
  const currentKey = normalizeJetteProductCode(options.currentProductCode);
  const existingKeys = new Set(
    (options.existingProductCodes || []).map(normalizeJetteProductCode).filter(Boolean)
  );
  const results = [];
  const seen = new Set();

  for (const row of Array.isArray(rows) ? rows : []) {
    const productCode = cleanText(row?.productCode);
    const key = normalizeJetteProductCode(productCode);
    if (!key || seen.has(key)) continue;

    const displayName = getJettePriceDisplayName(row);
    const haystack = [
      productCode,
      row?.productName,
      displayName,
      row?.temperature,
      row?.salesUnit,
      row?.taxType,
    ]
      .map(cleanText)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(term)) continue;
    seen.add(key);
    results.push({
      ...row,
      productCode,
      displayName,
      alreadyRegistered: existingKeys.has(key) && key !== currentKey,
    });
    if (results.length >= limit) break;
  }

  return results;
}
