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
const ALLERGEN_ORDER_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map((item, index) => [asDisplayText(item.allergenCode), index])
);
function allergenOrderOf(code) {
  return code in ALLERGEN_ORDER_BY_CODE ? ALLERGEN_ORDER_BY_CODE[code] : Number.MAX_SAFE_INTEGER;
}

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
  const names = [...asStringArray(ingredient?.allergens)]
    .sort((a, b) => allergenOrderOf(a) - allergenOrderOf(b))
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

function hasNumericValue(value) {
  return value !== '' && value != null && Number.isFinite(parseFloat(value));
}

/**
 * 기본값(baseline, 모달을 열 때의 저장값)의 중량 대비 새 중량 비율로 나머지 영양성분을 비례
 * 계산한다 — 토핑 값은 해당 중량 1회분의 절대값(basis:'serving')이라 단순 비례가 맞다.
 * 항상 저장값 기준으로 계산해 여러 번 바꿔도 반올림 오차가 쌓이지 않는다. 0.1 단위 반올림,
 * 빈칸은 빈칸 유지. 비율을 구할 수 없으면(저장 중량 없음/0, 새 중량이 숫자 아님) null.
 * @returns {Record<string, number|string>|null} weight를 제외한 필드들
 */
export function scaleToppingValuesToWeight(baseline, nextWeight) {
  const baseWeight = parseFloat(baseline?.weight);
  const weight = parseFloat(nextWeight);
  if (!(baseWeight > 0) || !Number.isFinite(weight) || weight < 0) return null;
  const ratio = weight / baseWeight;
  const out = {};
  for (const { key } of NUTRITION_FIELDS) {
    if (key === 'weight') continue;
    const value = baseline?.[key];
    out[key] = hasNumericValue(value)
      ? Math.round(parseFloat(value) * ratio * 10) / 10
      : (value ?? '');
  }
  return out;
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
