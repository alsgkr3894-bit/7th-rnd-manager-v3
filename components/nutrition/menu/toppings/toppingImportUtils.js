/**
 * components/nutrition/menu/toppings/toppingImportUtils.js
 * — 추가토핑 엑셀 가져오기 미리보기의 상수·식자재 옵션 매칭 (순수)
 */
import { NUTRITION_FIELDS } from '@/lib/nutrition/values/store';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export const STATUS = {
  ready: { label: '신규', color: '#2563eb', bg: '#dbeafe' },
  exists: { label: '업데이트', color: '#16a34a', bg: '#dcfce7' },
  dup: { label: '중복', color: '#b45309', bg: '#fef3c7' },
  invalid: { label: '확인필요', color: '#dc2626', bg: '#fee2e2' },
};

export const PREVIEW_FIELDS = ['weight', 'kcal', 'sugar', 'protein', 'fat', 'satFat', 'sodium'];
export const FIELD_BY_KEY = Object.fromEntries(NUTRITION_FIELDS.map(field => [field.key, field]));
export const INPUT_STYLE = {
  width: '100%',
  minWidth: 0,
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 9px',
  background: 'var(--surface)',
  color: 'var(--text-1)',
  fontSize: 12,
  fontWeight: 700,
  outline: 'none',
};
export const NUMERIC_INPUT_STYLE = {
  ...INPUT_STYLE,
  minWidth: 82,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};
export const ALLERGEN_NAME_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map(item => [asText(item.allergenCode), asText(item.allergenName)])
);
export const ALLERGEN_ORDER_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map((item, index) => [asText(item.allergenCode), index])
);
export function allergenOrderOf(code) {
  return code in ALLERGEN_ORDER_BY_CODE ? ALLERGEN_ORDER_BY_CODE[code] : Number.MAX_SAFE_INTEGER;
}

export function asText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim();
}

export function textKey(value) {
  return asText(value).replace(/\s+/g, '').toLowerCase();
}

export function parseImportNumberInput(value) {
  if (value === '' || value == null) return '';
  const text = String(value)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, '');
  if (!text || text === '-' || text === '.' || text === '-.') return '';
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? Math.max(0, num) : '';
}

export function ingredientNameOf(ingredient) {
  return asText(ingredient?.ingredientName || ingredient?.displayName || ingredient?.productName);
}

export function buildIngredientOptions(ingredients) {
  return asObjectArray(ingredients)
    .map((ingredient, index) => {
      const productCode = asText(ingredient?.productCode);
      const ingredientName = ingredientNameOf(ingredient);
      const label = [productCode, ingredientName].filter(Boolean).join(' | ');
      const allergens = asStringArray(ingredient?.allergens);
      return {
        key: productCode || `${ingredientName}-${index}`,
        productCode,
        ingredientName,
        allergens,
        allergenText: [...allergens]
          .sort((a, b) => allergenOrderOf(a) - allergenOrderOf(b))
          .map(code => ALLERGEN_NAME_BY_CODE[code] || code)
          .join(', '),
        label,
        labelKey: textKey(label),
        codeKey: textKey(productCode),
        nameKey: textKey(ingredientName),
      };
    })
    .filter(option => option.productCode || option.ingredientName);
}

export function findIngredientOption(input, options) {
  const raw = asText(input);
  const key = textKey(raw);
  if (!key) return null;
  return (
    options.find(
      option =>
        key === option.labelKey ||
        key === option.codeKey ||
        key === option.nameKey ||
        raw === option.productCode ||
        raw === option.ingredientName
    ) || null
  );
}

export function searchIngredientOptions(input, options, limit = 8) {
  const key = textKey(input);
  const safeOptions = Array.isArray(options) ? options : [];
  if (!key) return safeOptions.slice(0, limit);
  return safeOptions
    .filter(
      option =>
        option.labelKey.includes(key) ||
        option.codeKey.includes(key) ||
        option.nameKey.includes(key)
    )
    .slice(0, limit);
}

export function resolveIngredientOption(
  input,
  options,
  { allowSingleMatch = false, allowFirst = false } = {}
) {
  const exact = findIngredientOption(input, options);
  if (exact) return exact;
  const matches = searchIngredientOptions(input, options);
  if (allowFirst) return matches[0] || null;
  if (allowSingleMatch && matches.length === 1) return matches[0];
  return null;
}

export function ingredientInputValue(row) {
  if (!row.hasIngredientMatch) {
    if (row.productCode) return row.productCode;
    if (row.ingredientName && row.ingredientName !== row.toppingName) return row.ingredientName;
    return '';
  }
  return [row.productCode, row.ingredientName].filter(Boolean).join(' | ');
}

export function ingredientAllergenText(row, options) {
  const option =
    findIngredientOption(row?.productCode, options) ||
    findIngredientOption(row?.ingredientName, options) ||
    findIngredientOption(ingredientInputValue(row), options);
  return option?.allergenText || '';
}
