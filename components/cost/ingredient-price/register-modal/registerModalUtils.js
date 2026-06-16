import { SEED_MAIN_CATEGORIES, sortMainCategories } from '@/lib/ingredient';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';

export function buildRegisterCategoryOptions(extraCategories = []) {
  return sortMainCategories([
    ...new Set([...SEED_MAIN_CATEGORIES, ...extraCategories].filter(Boolean)),
  ]);
}

export function buildInitialRegisterForm(row = {}, categoryOptions = []) {
  const existing = row.meta;
  const category = existing?.category || '';

  return {
    ingredientName: existing?.ingredientName || row.productName || '',
    category,
    baseQuantity: existing?.baseQuantity != null ? String(existing.baseQuantity) : '',
    baseUnitType: normalizeCostBaseUnit(existing?.baseUnitType),
    customCat: Boolean(category && !categoryOptions.includes(category)),
    supplierId: existing?.supplierId ?? '',
    supplierName: existing?.supplierName ?? '',
    priceOverride: existing?.priceOverride != null ? String(existing.priceOverride) : '',
  };
}

export function validateRegisterForm(form) {
  const errors = {};
  const baseQty = parseOptionalNonNegativeNumber(form.baseQuantity);
  const override = parseOptionalNonNegativeNumber(form.priceOverride);

  if (!baseQty.ok) {
    errors.baseQuantity = '포장수량은 0 이상 숫자만 입력하세요';
  }
  if (!override.ok) {
    errors.priceOverride = '단가는 0 이상 숫자만 입력하세요';
  }

  return { errors, baseQty: baseQty.value, override: override.value };
}

export function buildRegisterPayload({ row = {}, form, validated }) {
  return {
    ingredientName: form.ingredientName.trim() || row.productName,
    category: form.category.trim(),
    baseQuantity: validated.baseQty,
    baseUnitType: form.baseUnitType,
    taxType: row.taxType || '과세',
    supplierId: form.supplierId || null,
    supplierName: form.supplierName || null,
    priceOverride: validated.override,
  };
}

export function buildRegisterPriceChangePayload({ existing, row = {}, form, newPriceOverride }) {
  return {
    ingredientId: existing.id,
    productCode: existing.productCode ?? row.productCode,
    ingredientName: form.ingredientName.trim() || row.productName,
    oldPrice: existing.priceOverride ?? null,
    newPrice: newPriceOverride,
    source: 'register',
  };
}
