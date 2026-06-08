/**
 * lib/nutrition/ingredient-name-override.js
 * 출력용 식자재명 오버라이드 — localStorage 기반, 원산지 출력 공유.
 * { [ingredientName]: '출력용 이름' } 형태로 저장.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const KEY = 'v3:nutrition-ingredient-name-override';

export function loadIngredientNames() {
  const val = getJSONLS(KEY);
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
}

export function saveIngredientNames(map) {
  setJSONLS(KEY, typeof map === 'object' && !Array.isArray(map) ? map : {});
}

/** override 있으면 그 값, 없으면 원래 이름 */
export function applyIngredientName(ingredientName, overrides) {
  if (!overrides || !ingredientName) return ingredientName;
  const ov = overrides[ingredientName];
  return ov != null && ov.trim() !== '' ? ov.trim() : ingredientName;
}
