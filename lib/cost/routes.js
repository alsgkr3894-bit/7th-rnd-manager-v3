/**
 * lib/cost/routes.js — 원가/레시피 통합 후 canonical route 정책.
 */

export const MENU_MASTER_ROUTE = '/menu-master';
export const COST_MARGIN_ROUTE = '/cost/margin';
export const COST_COMMON_GROUPS_ROUTE = '/cost/recipe';
export const COST_COMMON_EDGES_ROUTE = '/cost/recipe?tab=edges';

export const LEGACY_COST_DETAIL_REDIRECT_ROUTE = COST_MARGIN_ROUTE;
export const LEGACY_RECIPE_MASTER_REDIRECT_ROUTE = MENU_MASTER_ROUTE;
