/**
 * lib/menu-master/recipe-issues.js — 레시피 이슈 분류 로직
 *
 * 기존 메뉴 목록과 recipeSummaryMap을 조합해 이슈 목록을 파생한다.
 * DB 추가 쿼리 없음 — page에서 이미 로드한 데이터를 재사용한다.
 */

import { MENU_RECIPE_SUMMARY_STATUS } from './recipe-summary.js';

export const ISSUE_KINDS = {
  NO_RECIPE: 'no-recipe',
  NEEDS_QUANTITY: 'needs-qty',
  NEEDS_PRICE: 'needs-price',
  NO_PRICE: 'no-price',
};

export const ISSUE_LABELS = {
  [ISSUE_KINDS.NO_RECIPE]: '레시피 미작성',
  [ISSUE_KINDS.NEEDS_QUANTITY]: '수량 누락',
  [ISSUE_KINDS.NEEDS_PRICE]: '단가 누락',
  [ISSUE_KINDS.NO_PRICE]: '판매가 누락',
};

/**
 * 식자재 레시피 기반 이슈/진행률 집계에서 제외해야 하는 요약인지 판정한다.
 * - UNSUPPORTED: 지원하지 않는 카테고리(레시피 자체가 없음)
 * - EDGE: 엣지는 공통원가관리(엣지 관리)의 원가를 그대로 보여주는 별도 표시 방식이라
 *   (MenuRecipeCostCell 참고) READY가 아니라는 이유만으로 "확인 필요"로 잡히면 안 된다.
 * buildRecipeIssues와 app/menu-master/page.jsx의 "레시피 작성" 진행률 집계가 이 기준을
 * 따로 구현하면 상태값이 늘어날 때마다 한쪽만 갱신되고 다른 쪽은 놓치기 쉬워 공유한다.
 *
 * @param {{status?: string}|null|undefined} summary
 * @returns {boolean}
 */
export function isRecipeSummaryExcludedFromTracking(summary) {
  return (
    !summary ||
    summary.status === MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED ||
    summary.status === MENU_RECIPE_SUMMARY_STATUS.EDGE
  );
}

/**
 * 메뉴 목록과 recipeSummaryMap을 조합해 이슈 목록을 생성한다.
 *
 * @param {object[]} menus
 * @param {Map<string, object>} recipeSummaryMap
 * @returns {{ menu: object, kind: string }[]}
 */
export function buildRecipeIssues(menus, recipeSummaryMap) {
  const issues = [];
  for (const menu of Array.isArray(menus) ? menus : []) {
    const menuCode = String(menu?.menuCode || '').trim();
    if (!menuCode) continue;
    const summary = recipeSummaryMap.get(menuCode);

    if (isRecipeSummaryExcludedFromTracking(summary)) continue;

    if (!summary.hasRecipe) {
      issues.push({ menu, kind: ISSUE_KINDS.NO_RECIPE });
    } else if (summary.status === MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY) {
      issues.push({ menu, kind: ISSUE_KINDS.NEEDS_QUANTITY });
    } else if (summary.status === MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE) {
      issues.push({ menu, kind: ISSUE_KINDS.NEEDS_PRICE });
    }

    // 판매가 누락은 독립적으로 체크 (레시피 상태와 무관)
    if (menu.price == null || menu.price === '' || Number(menu.price) <= 0) {
      issues.push({ menu, kind: ISSUE_KINDS.NO_PRICE });
    }
  }
  return issues;
}

/**
 * 이슈 목록을 kind 기준 탭 필터로 분류한다.
 *
 * @param {{ menu: object, kind: string }[]} issues
 * @param {string} kindFilter - 'all' 또는 ISSUE_KINDS 값
 * @returns {{ menu: object, kind: string }[]}
 */
export function filterIssuesByKind(issues, kindFilter) {
  if (!kindFilter || kindFilter === 'all') return issues;
  return issues.filter(issue => issue.kind === kindFilter);
}
