/**
 * lib/menu-master/linked-code-plan.js — menuCode 변경/삭제 시 연결 store 캐스케이드 규칙 (순수)
 *
 * menu_master 행이 참조하는 store마다 menuCode를 "어느 형태"로 저장하는지가 다르다:
 * - full  : menuCode 원문 그대로(사이즈별로 구분). cost_selling_prices, menu_recipes.
 * - base  : 사이즈 접미사를 뗀 코드(L/R을 하나의 메뉴로 묶음). nutrition_menu_ref,
 *           nutrition_raw_values. 피자 L/R처럼 두 menu_master 행이 base 코드를 공유하는
 *           경우, 한쪽만 코드를 바꾸면 다른 쪽이 여전히 그 base를 쓰고 있으므로 옮기면
 *           안 된다(옮기면 남은 형제 규격이 영양 데이터를 잃는다) — shouldMoveNutritionBase가
 *           이 경우를 판별한다.
 * - history: append-only 이력. 코드 변경 시에는 함께 옮겨야(안 그러면 옛 코드에 이력이
 *           남아 findOrphanRecipeVersions가 고아로 오판) 하지만, 메뉴 삭제 시에는 이력
 *           자체를 지우지 않는다(store.js 쪽에서 별도 처리).
 */

import { getMenuCodeBase } from './code-policy';

export const LINKED_MENU_CODE_STORE_POLICY = Object.freeze({
  cost_selling_prices: 'full',
  menu_recipes: 'full',
  menu_recipe_versions: 'history',
  nutrition_menu_ref: 'base',
  nutrition_raw_values: 'base',
});

export const LINKED_STORE_LABELS = Object.freeze({
  cost_selling_prices: '판매가',
  menu_recipes: '메뉴 레시피',
  menu_recipe_versions: '레시피 이력',
  nutrition_menu_ref: '영양 메뉴',
  nutrition_raw_values: '영양값',
});

/** menu(현재 코드 기준)와 base 코드가 같은 다른 menu_master 행이 있는지 — 있으면 "형제 규격". */
export function hasSiblingSharingBase(menu, allMenus) {
  if (!menu?.menuCode) return false;
  const base = getMenuCodeBase(menu);
  if (!base) return false;
  return (Array.isArray(allMenus) ? allMenus : []).some(
    other => other && other.id !== menu.id && getMenuCodeBase(other) === base
  );
}

/**
 * base 코드 store(영양)를 옮겨도 되는지 — base 코드 자체가 바뀌었고, 옮기려는 메뉴(existing,
 * 변경 전 상태) 말고 같은 옛 base를 쓰는 형제 규격이 없을 때만 옮긴다.
 */
export function shouldMoveNutritionBase(existing, next, allMenus) {
  const oldBase = getMenuCodeBase(existing);
  const newBase = getMenuCodeBase(next);
  if (!oldBase || !newBase || oldBase === newBase) return false;
  return !hasSiblingSharingBase(existing, allMenus);
}

/** 해당 store의 정책에 맞는 "이 코드로 옮겨야 할 원본 행" 매칭 코드. */
export function sourceCodeFor(storeName, { fromFull, fromBase }) {
  return LINKED_MENU_CODE_STORE_POLICY[storeName] === 'base' ? fromBase : fromFull;
}

/** 해당 store의 정책에 맞는 "이동 대상" 코드. */
export function targetCodeFor(storeName, { toFull, toBase }) {
  return LINKED_MENU_CODE_STORE_POLICY[storeName] === 'base' ? toBase : toFull;
}

/**
 * 코드 변경 캐스케이드 결과 요약 문구.
 * @param {{from:string,to:string,updated:Record<string,number>,skipped?:{nutrition?:string|null}}} cascade
 */
export function formatMenuCodeCascadeSummary(cascade) {
  if (!cascade) return '저장 완료';
  const { from, to, updated = {}, skipped } = cascade;
  const parts = Object.entries(updated)
    .filter(([, count]) => count > 0)
    .map(([storeName, count]) => `${LINKED_STORE_LABELS[storeName] || storeName} ${count}건`);
  const base = parts.length
    ? `메뉴코드 ${from} → ${to} 변경: ${parts.join('·')} 이동`
    : `메뉴코드 ${from} → ${to} 변경`;
  if (skipped?.nutrition === 'sibling') {
    return `${base} · 영양성분은 다른 규격이 같은 코드를 써서 유지`;
  }
  return base;
}

/** 같은 코드를 쓰는 다른 메뉴마스터 행(수정 대상 제외)을 찾는다 — 저장 전 미리 경고하기 위함. */
export function findMenuCodeConflict(rows, menuCode, excludeId) {
  const code = String(menuCode || '').trim();
  if (!code) return null;
  return (
    (Array.isArray(rows) ? rows : []).find(
      row => row && row.menuCode === code && String(row.id) !== String(excludeId)
    ) || null
  );
}
