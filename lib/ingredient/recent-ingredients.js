const KEY = 'recipe_recent_ingredients';
const MAX = 8;

export function getRecentIngredientCodes() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentIngredientCode(productCode) {
  if (typeof localStorage === 'undefined' || !productCode) return;
  try {
    const codes = getRecentIngredientCodes().filter(c => c !== productCode);
    codes.unshift(productCode);
    localStorage.setItem(KEY, JSON.stringify(codes.slice(0, MAX)));
  } catch {
    // ignore storage errors
  }
}
