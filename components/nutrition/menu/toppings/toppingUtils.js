import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { NUTRITION_FIELDS } from '@/lib/nutrition/values/store';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export const EMPTY_TOPPING_PRICE_MAP = new Map();

export const EMPTY_TOPPING_FORM = {
  toppingCode: '',
  toppingName: '',
  productCode: '',
  ingredientName: '',
};

export const ALLERGEN_NAME_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map(item => [asDisplayText(item.allergenCode), asDisplayText(item.allergenName)])
);

export function normalizeToppingIngredientName(row) {
  return asDisplayText(
    row?.ingredientName || row?.displayName || row?.productName || row?.productCode
  );
}

export function toppingIngredientNameKey(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizeToppingIngredients(ingredients) {
  return asObjectArray(ingredients).map(row => ({
    ...row,
    ingredientName: normalizeToppingIngredientName(row),
  }));
}

export function buildToppingIngredientLookups(ingredients) {
  const ingredientByCode = new Map();
  const ingredientByName = new Map();

  for (const ingredient of asObjectArray(ingredients)) {
    const productCode = asDisplayText(ingredient.productCode);
    if (productCode) ingredientByCode.set(productCode, ingredient);

    const nameKey = toppingIngredientNameKey(ingredient.ingredientName);
    if (nameKey) ingredientByName.set(nameKey, ingredient);
  }

  return { ingredientByCode, ingredientByName };
}

export function findLinkedToppingIngredient(topping, lookups) {
  const productCode = asDisplayText(topping?.productCode);
  if (productCode && lookups.ingredientByCode.has(productCode)) {
    return lookups.ingredientByCode.get(productCode);
  }

  const nameKey = toppingIngredientNameKey(topping?.ingredientName || topping?.toppingName);
  return nameKey ? lookups.ingredientByName.get(nameKey) || null : null;
}

export function toppingAllergenText(topping, lookups) {
  const ingredient = findLinkedToppingIngredient(topping, lookups);
  const names = asStringArray(ingredient?.allergens)
    .map(code => ALLERGEN_NAME_BY_CODE[code] || code)
    .filter(Boolean);
  return names.length ? names.join(', ') : '없음';
}

export function formatToppingNutritionValue(value, suffix = '') {
  const text = asDisplayText(value);
  if (!text) return '미입력';
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return `${Math.round(num).toLocaleString('ko-KR')}${suffix}`;
}

export function toppingFormFromRecord(topping) {
  if (!topping || topping === 'add') return EMPTY_TOPPING_FORM;
  return {
    toppingCode: asDisplayText(topping.toppingCode),
    toppingName: asDisplayText(topping.toppingName),
    productCode: asDisplayText(topping.productCode),
    ingredientName: asDisplayText(topping.ingredientName),
  };
}

export function toppingValuesFromRecord(topping) {
  if (!topping || topping === 'add') return {};
  return NUTRITION_FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: topping[key] ?? '' }), {});
}

export function buildToppingSavePayload({ modal, form, values, now = Date.now() }) {
  const toppingName = asDisplayText(form.toppingName).trim();
  const toppingCode = asDisplayText(form.toppingCode).trim() || `TOP-${now}`;
  const id = modal !== 'add' ? modal?.id : undefined;

  return {
    ...(id ? { id } : {}),
    ...form,
    toppingName,
    toppingCode,
    basis: 'serving',
    ...values,
  };
}
