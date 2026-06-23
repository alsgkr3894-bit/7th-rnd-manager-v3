import { asDisplayText } from '../ui/prop-guards.js';

export const PRODUCT_TYPE_EXCLUSIVE = 'exclusive';
export const PRODUCT_TYPE_GENERIC = 'generic';
export const LEGACY_PRODUCT_TYPE_GENERIC_MANAGED = 'generic-managed';

export const PRODUCT_TYPE_OPTIONS = [
  { value: PRODUCT_TYPE_EXCLUSIVE, label: '전용상품' },
  { value: PRODUCT_TYPE_GENERIC, label: '범용상품' },
];

export const PRODUCT_TYPE_LABEL = {
  [PRODUCT_TYPE_EXCLUSIVE]: '전용상품',
  [PRODUCT_TYPE_GENERIC]: '범용상품',
};

export const PRODUCT_TYPE_SHORT_LABEL = {
  [PRODUCT_TYPE_EXCLUSIVE]: '전용',
  [PRODUCT_TYPE_GENERIC]: '범용',
};

export const PRODUCT_TYPE_ORDER = {
  [PRODUCT_TYPE_EXCLUSIVE]: 0,
  [PRODUCT_TYPE_GENERIC]: 1,
};

export function isLegacyManagedProductType(productType) {
  return asDisplayText(productType) === LEGACY_PRODUCT_TYPE_GENERIC_MANAGED;
}

export function normalizeProductType(productType) {
  return asDisplayText(productType) === PRODUCT_TYPE_EXCLUSIVE
    ? PRODUCT_TYPE_EXCLUSIVE
    : PRODUCT_TYPE_GENERIC;
}

export function canManageProductType(productType) {
  return normalizeProductType(productType) === PRODUCT_TYPE_GENERIC;
}

export function normalizeManagedFlag(productType, isManaged) {
  return canManageProductType(productType) && Boolean(isManaged);
}

export function normalizeManagedProductDraft(product = {}) {
  const safeProduct = product && typeof product === 'object' ? product : {};
  const productType = normalizeProductType(safeProduct.productType);
  return {
    ...safeProduct,
    productType,
    isManaged: normalizeManagedFlag(productType, safeProduct.isManaged),
  };
}

export function normalizeManagedProductRecord(product = {}) {
  const safeProduct = product && typeof product === 'object' ? product : {};
  const productType = normalizeProductType(safeProduct.productType);
  return {
    ...safeProduct,
    productType,
    isManaged: normalizeManagedFlag(
      productType,
      Boolean(safeProduct.isManaged) || isLegacyManagedProductType(safeProduct.productType)
    ),
  };
}

export function getProductTypeLabel(productType, short = false) {
  const normalized = normalizeProductType(productType);
  return short ? PRODUCT_TYPE_SHORT_LABEL[normalized] : PRODUCT_TYPE_LABEL[normalized];
}
