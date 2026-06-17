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

    // 지원하지 않는 카테고리(엣지 등)는 이슈 대상에서 제외
    if (!summary || summary.status === MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED) continue;

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
