/**
 * scripts/full-rt.mjs — 전 라우트 런타임 회귀 검사
 *
 * dev 서버(localhost:3000)가 떠 있는 상태에서 실행:
 *   node scripts/full-rt.mjs
 *
 * 검사 항목: JS pageerror, console.error, hydration 오류, h1/main 존재, HTTP 500
 * 특이 케이스: 비-main 브랜드에서 노트 관련 라우트 직접 진입 (공유 DB 초기화 검증)
 */
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';

const BASE = getQaBase();
const NAV_TIMEOUT_MS = Number.parseInt(process.env.QA_NAV_TIMEOUT_MS || '', 10) || 90_000;

const MAIN_ROUTES = [
  '/',
  '/menu-master',
  '/menu-sales',
  '/menu-sales/upload',
  '/menu-sales/rank',
  '/menu-sales/rank-compare',
  '/menu-sales/compare',
  '/menu-sales/unmatched',
  '/menu-sales/settings',
  '/jette',
  '/jette/price-compare',
  '/jette/shipment',
  '/jette/settings',
  '/ingredient/manage',
  '/ingredient/list',
  '/ingredient/usage',
  '/cost',
  '/cost/pizza',
  '/cost/side',
  '/cost/set',
  '/cost/personal',
  '/cost/edge-dough',
  '/cost/all-summary',
  '/cost/margin',
  '/cost/recipe',
  '/cost/ingredient-price',
  '/cost/manage',
  '/nutrition',
  '/nutrition/menu',
  '/nutrition/allergen',
  '/nutrition/origin',
  '/nutrition/export',
  '/note',
  '/note/write',
  '/note/board',
  '/note/calendar',
  '/note/journal',
  '/note/sample',
  '/report',
  '/report/cost',
  '/report/sales',
  '/report/price',
  '/report/shipment',
  '/report/menu-sales-compare',
  '/settings/system',
  '/settings/account',
  '/settings/backup',
  '/settings/restore',
];

const CHINA4_ROUTES = [
  '/',
  '/menu-master',
  '/cost/edge-dough',
  '/ingredient/manage',
  '/menu-sales/settings',
  '/note',
  '/settings/backup',
  '/settings/restore',
];

// 비-main 브랜드에서 노트 직접 진입 — 공유 DB 초기화 버그 검증
const CHINA4_DIRECT_ROUTES = ['/note', '/note/write', '/note/sample', '/note/calendar'];

const IGNORE_PATTERNS = [
  /share-modal/i,
  /React DevTools/i,
  /ResizeObserver/i,
  /Download the React/i,
  /extension/i,
  /chrome-extension/i,
  /noreply@anthropic/i,
];

function filterErr(msg) {
  return !IGNORE_PATTERNS.some(p => p.test(msg));
}

const browser = await chromium.launch();
const results = [];

async function checkRoute(page, brand, route, directEntry = false) {
  const errs = [],
    consoleErrs = [];
  const onPageError = e => errs.push(e.message.split('\n')[0]);
  const onConsole = m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (filterErr(t)) consoleErrs.push(t.split('\n')[0]);
    }
  };

  if (directEntry) {
    // 진짜 직접 진입: addInitScript로 홈 방문 없이 localStorage를 미리 세팅 후 바로 라우트 이동.
    // 이전 방식( / → 브랜드 설정 → route)은 홈 방문 중 main DB가 열려 공유 DB 버그가 가려짐.
    const ctx = await newAuthedContext(browser, {}, BASE);
    await ctx.addInitScript(
      ({ key, val }) => {
        localStorage.setItem(key, val);
      },
      { key: 'v3:active-brand', val: brand }
    );
    const p2 = await ctx.newPage();
    p2.on('pageerror', onPageError);
    p2.on('console', onConsole);
    try {
      await p2.goto(routeUrl(BASE, route), { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
      await p2.waitForTimeout(1500);
      const hasContent = await p2.evaluate(
        () => !!(document.querySelector('h1') || document.querySelector('main'))
      );
      const hyd = errs.filter(e => /hydrat/i.test(e));
      return {
        brand: `${brand}(직접)`,
        route,
        errs: errs.filter(e => !/hydrat/i.test(e)),
        hyd,
        consoleErrs,
        hasContent,
      };
    } finally {
      p2.off('pageerror', onPageError);
      p2.off('console', onConsole);
      await ctx.close();
    }
  }

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  try {
    await page.evaluate(b => localStorage.setItem('v3:active-brand', b), brand);
    await page.goto(routeUrl(BASE, route), { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(800);

    const hyd = errs.filter(e => /hydrat/i.test(e));
    const jsErrs = errs.filter(e => !/hydrat/i.test(e));
    const hasContent = await page.evaluate(
      () => !!(document.querySelector('h1') || document.querySelector('main'))
    );

    return { brand, route, errs: jsErrs, hyd, consoleErrs, hasContent };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}

// main 브랜드
{
  const ctx = await newAuthedContext(browser, {}, BASE);
  const page = await ctx.newPage();
  await page.goto(routeUrl(BASE, '/'), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('v3:active-brand', 'main'));
  for (const route of MAIN_ROUTES) {
    results.push(await checkRoute(page, 'main', route));
  }
  await page.close();
  await ctx.close();
}

// china4 브랜드 (홈 경유)
{
  const ctx = await newAuthedContext(browser, {}, BASE);
  const page = await ctx.newPage();
  await page.goto(routeUrl(BASE, '/'), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('v3:active-brand', 'china4'));
  for (const route of CHINA4_ROUTES) {
    results.push(await checkRoute(page, 'china4', route));
  }
  await page.close();
  await ctx.close();
}

// china4 — 노트 관련 직접 진입 (공유 DB 초기화 검증)
for (const route of CHINA4_DIRECT_ROUTES) {
  results.push(await checkRoute(null, 'china4', route, true));
}

await browser.close();

// 출력
const W = { brand: 20, route: 35, status: 6, errs: 8, hyd: 5, con: 5 };
console.log('\n  전체 런타임 회귀 검사\n');
console.log(
  '  ' +
    '브랜드'.padEnd(W.brand) +
    '라우트'.padEnd(W.route) +
    '상태'.padEnd(W.status) +
    '에러'.padEnd(W.errs) +
    'hyd'.padEnd(W.hyd) +
    '콘솔'
);
console.log('  ' + '─'.repeat(W.brand + W.route + W.status + W.errs + W.hyd + 10));

let pass = 0,
  fail = 0;
const failed = [];
for (const r of results) {
  const ok =
    r.errs.length === 0 && r.hyd.length === 0 && r.consoleErrs.length === 0 && r.hasContent;
  const status = ok ? '✅' : '❌';
  if (ok) pass++;
  else {
    fail++;
    failed.push(r);
  }
  console.log(
    '  ' +
      r.brand.padEnd(W.brand) +
      r.route.padEnd(W.route) +
      status.padEnd(W.status) +
      String(r.errs.length).padEnd(W.errs) +
      String(r.hyd.length).padEnd(W.hyd) +
      r.consoleErrs.length
  );
}

console.log('\n  ' + '─'.repeat(80));
console.log(`\n  ${pass + fail}개 검사 — PASS: ${pass}, FAIL: ${fail}\n`);

if (failed.length > 0) {
  console.log('  ── FAIL 상세 ──');
  for (const r of failed) {
    console.log(`\n  [${r.brand}] ${r.route}`);
    if (!r.hasContent) console.log('    빈 화면 (h1/main 없음)');
    for (const e of [...r.errs, ...r.hyd, ...r.consoleErrs].slice(0, 3))
      console.log('    ' + e.slice(0, 100));
  }
  process.exitCode = 1;
}
