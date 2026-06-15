export const ROUTE_KIND = Object.freeze({
  SIDEBAR: 'sidebar',
  HUB: 'hub',
  REDIRECT: 'redirect',
  INTERNAL_FLOW: 'internal-flow',
  STATIC_DETAIL: 'static-detail',
  DYNAMIC_DETAIL: 'dynamic-detail',
});

export const ROUTE_MARKER = Object.freeze({
  MOBILE_PRIMARY: 'mobile-primary',
});

const MAIN = 'main';
const CHINA4 = 'china4';
const CHINA4_DIRECT = 'china4-direct';

export const ROUTE_CLASSIFICATIONS = Object.freeze([
  {
    route: '/',
    kind: ROUTE_KIND.SIDEBAR,
    markers: [ROUTE_MARKER.MOBILE_PRIMARY],
    runtime: [MAIN, CHINA4],
  },
  { route: '/login', kind: ROUTE_KIND.INTERNAL_FLOW },
  { route: '/menu-master', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4] },

  { route: '/menu-sales', kind: ROUTE_KIND.HUB, runtime: [MAIN] },
  { route: '/menu-sales/upload', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/menu-sales/rank', kind: ROUTE_KIND.REDIRECT, target: '/menu-sales/rank-compare', runtime: [MAIN] },
  {
    route: '/menu-sales/rank-compare',
    kind: ROUTE_KIND.SIDEBAR,
    markers: [ROUTE_MARKER.MOBILE_PRIMARY],
    runtime: [MAIN],
  },
  { route: '/menu-sales/compare', kind: ROUTE_KIND.REDIRECT, target: '/menu-sales/rank-compare', runtime: [MAIN] },
  { route: '/menu-sales/unmatched', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/menu-sales/settings', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4] },

  { route: '/jette', kind: ROUTE_KIND.HUB, runtime: [MAIN] },
  { route: '/jette/price-compare', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/jette/shipment', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/jette/settings', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },

  { route: '/ingredient', kind: ROUTE_KIND.HUB, runtime: [MAIN] },
  { route: '/ingredient/manage', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4] },
  { route: '/ingredient/list', kind: ROUTE_KIND.REDIRECT, target: '/ingredient/manage', runtime: [MAIN] },
  { route: '/ingredient/usage', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },

  { route: '/cost', kind: ROUTE_KIND.HUB, runtime: [MAIN] },
  { route: '/cost/pizza', kind: ROUTE_KIND.REDIRECT, target: '/cost/margin', runtime: [MAIN] },
  { route: '/cost/side', kind: ROUTE_KIND.REDIRECT, target: '/cost/margin', runtime: [MAIN] },
  { route: '/cost/set', kind: ROUTE_KIND.REDIRECT, target: '/cost/margin', runtime: [MAIN] },
  { route: '/cost/personal', kind: ROUTE_KIND.REDIRECT, target: '/cost/margin', runtime: [MAIN] },
  { route: '/cost/edge-dough', kind: ROUTE_KIND.REDIRECT, target: '/cost/recipe?tab=edges', runtime: [MAIN, CHINA4] },
  { route: '/cost/all-summary', kind: ROUTE_KIND.STATIC_DETAIL, runtime: [MAIN] },
  {
    route: '/cost/margin',
    kind: ROUTE_KIND.SIDEBAR,
    markers: [ROUTE_MARKER.MOBILE_PRIMARY],
    runtime: [MAIN],
  },
  { route: '/cost/recipe', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/cost/ingredient-price', kind: ROUTE_KIND.REDIRECT, target: '/ingredient/manage?view=price', runtime: [MAIN] },
  { route: '/cost/manage', kind: ROUTE_KIND.REDIRECT, target: '/cost/recipe', runtime: [MAIN] },

  { route: '/nutrition', kind: ROUTE_KIND.HUB, runtime: [MAIN] },
  { route: '/nutrition/menu', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/nutrition/allergen', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/nutrition/origin', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/nutrition/export', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },

  {
    route: '/note',
    kind: ROUTE_KIND.SIDEBAR,
    markers: [ROUTE_MARKER.MOBILE_PRIMARY],
    runtime: [MAIN, CHINA4, CHINA4_DIRECT],
  },
  { route: '/note/write', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4_DIRECT] },
  { route: '/note/[id]', kind: ROUTE_KIND.DYNAMIC_DETAIL },
  { route: '/note/board', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/note/calendar', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4_DIRECT] },
  { route: '/note/journal', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/note/sample', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4_DIRECT] },
  { route: '/note/sample/write', kind: ROUTE_KIND.INTERNAL_FLOW, runtime: [MAIN] },
  { route: '/note/sample/[id]', kind: ROUTE_KIND.DYNAMIC_DETAIL },

  {
    route: '/report',
    kind: ROUTE_KIND.SIDEBAR,
    markers: [ROUTE_MARKER.MOBILE_PRIMARY],
    runtime: [MAIN],
  },
  { route: '/report/cost', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/report/sales', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/report/price', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/report/shipment', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/report/menu-sales-compare', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },

  { route: '/settings', kind: ROUTE_KIND.REDIRECT, target: '/settings/brands', runtime: [MAIN] },
  { route: '/settings/brands', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/settings/system', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/settings/account', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN] },
  { route: '/settings/backup', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4] },
  { route: '/settings/restore', kind: ROUTE_KIND.SIDEBAR, runtime: [MAIN, CHINA4] },
]);

export function routesForRuntimeGroup(group) {
  return ROUTE_CLASSIFICATIONS.filter(item => item.runtime?.includes(group)).map(
    item => item.route
  );
}

export function routesForMarker(marker) {
  return ROUTE_CLASSIFICATIONS.filter(item => item.markers?.includes(marker)).map(
    item => item.route
  );
}

export const MAIN_RUNTIME_ROUTES = Object.freeze(routesForRuntimeGroup(MAIN));
export const CHINA4_RUNTIME_ROUTES = Object.freeze(routesForRuntimeGroup(CHINA4));
export const CHINA4_DIRECT_RUNTIME_ROUTES = Object.freeze(routesForRuntimeGroup(CHINA4_DIRECT));
export const MOBILE_PRIMARY_ROUTES = Object.freeze(routesForMarker(ROUTE_MARKER.MOBILE_PRIMARY));
