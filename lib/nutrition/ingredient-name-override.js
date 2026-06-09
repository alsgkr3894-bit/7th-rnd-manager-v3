/**
 * lib/nutrition/ingredient-name-override.js
 * 출력용 식자재명 오버라이드 — localStorage 기반, 원산지 출력 공유.
 * { [ingredientName]: '출력용 이름' } 형태로 저장.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const KEY = 'v3:nutrition-ingredient-name-override';

function normalizeNameMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
  );
}

export function loadIngredientNames() {
  const val = getJSONLS(KEY);
  return normalizeNameMap(val);
}

export function saveIngredientNames(map) {
  setJSONLS(KEY, normalizeNameMap(map));
}

/** override 있으면 그 값, 없으면 원래 이름 */
export function applyIngredientName(ingredientName, overrides) {
  if (!overrides || !ingredientName) return ingredientName;
  const ov = overrides[ingredientName];
  return typeof ov === 'string' && ov.trim() !== '' ? ov.trim() : ingredientName;
}
