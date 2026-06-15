import { asDisplayText, asObjectArray } from '../ui/prop-guards.js';

export function buildAutoRegisterCandidates(priceRows, existingProducts) {
  const knownCodes = new Set(
    asObjectArray(existingProducts)
      .map(product => asDisplayText(product.productCode).trim())
      .filter(Boolean)
  );
  const candidates = new Map();

  for (const row of asObjectArray(priceRows)) {
    const productCode = asDisplayText(row.productCode).trim();
    const productName = asDisplayText(row.productName).trim();
    if (!productCode || !productName) continue;
    if (knownCodes.has(productCode) || candidates.has(productCode)) continue;
    candidates.set(productCode, {
      productCode,
      productName,
      productType: 'generic',
      isManaged: false,
    });
  }

  return [...candidates.values()];
}
