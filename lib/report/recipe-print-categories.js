/**
 * lib/report/recipe-print-categories.js — 레시피 출력 카테고리 색상/순서 단일 출처
 *
 * RecipePrintView.jsx가 갖고 있던 CATEGORY_COLORS를 여기로 옮긴다 — 엣지가 빠져 있던
 * 것도 함께 정리(레시피 출력 대상에는 원래 엣지가 없으므로 표에는 없지만, 옵션 UI의
 * 그룹 점 색상 등에서 재사용할 수 있도록 kind 기준으로 통일).
 */

export const RECIPE_PRINT_CATEGORY_META = {
  pizza: { id: 'pizza', label: '피자', color: '#3182F6' },
  personal: { id: 'personal', label: '1인피자', color: '#10B981' },
  set: { id: 'set', label: '세트박스', color: '#EC4899' },
  side: { id: 'side', label: '사이드', color: '#F59E0B' },
  topping: { id: 'topping', label: '추가토핑', color: '#14B8A6' },
};

export const RECIPE_PRINT_KIND_ORDER = ['pizza', 'personal', 'set', 'side', 'topping'];

/** kind('pizza' 등) 또는 categoryLabel('피자' 등) 어느 쪽을 넘겨도 색상을 찾는다. */
export function recipePrintCategoryColor(kindOrLabel) {
  const key = String(kindOrLabel || '');
  if (RECIPE_PRINT_CATEGORY_META[key]) return RECIPE_PRINT_CATEGORY_META[key].color;
  const byLabel = Object.values(RECIPE_PRINT_CATEGORY_META).find(meta => meta.label === key);
  return byLabel?.color || 'var(--text-3)';
}
