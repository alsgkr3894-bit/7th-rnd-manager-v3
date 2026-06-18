/**
 * scripts/full-rt.mjs — 전 라우트 런타임 회귀 검사
 *
 * dev 서버(localhost:3000)가 떠 있는 상태에서 실행:
 *   node scripts/full-rt.mjs
 *
 * 검사 항목: JS pageerror, console.error, hydration 오류, h1/main 존재, HTTP 500
 * 특이 케이스: 비-main 브랜드에서 노트 관련 라우트 직접 진입 (공유 DB 초기화 검증)
 */
import {
  assertQaBaseReachableWithBrowser,
  chromium,
  getQaBase,
  newAuthedContext,
  routeUrl,
} from './qa-browser-utils.mjs';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  CHINA4_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
} from '../lib/navigation/route-classification.js';
import { DB_NAME } from '../lib/db/constants.js';

const BASE = getQaBase();
const NAV_TIMEOUT_MS = Number.parseInt(process.env.QA_NAV_TIMEOUT_MS || '', 10) || 90_000;
const HEALTH_TIMEOUT_MS = Number.parseInt(process.env.QA_HEALTH_TIMEOUT_MS || '', 10) || 5000;

const MAIN_ROUTES = MAIN_RUNTIME_ROUTES;
const CHINA4_ROUTES = CHINA4_RUNTIME_ROUTES;

// 비-main 브랜드에서 노트 직접 진입 — 공유 DB 초기화 버그 검증
const CHINA4_DIRECT_ROUTES = CHINA4_DIRECT_RUNTIME_ROUTES;

const DYNAMIC_FIXTURE_ROUTES = [
  { route: '/note/900001', store: 'menu_dev_notes' },
  { route: '/note/sample/900001', store: 'sample_records' },
];

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

function fatalMessage(error) {
  return (error?.message || String(error)).split('\n')[0];
}

const browser = await chromium.launch();

try {
  await assertQaBaseReachableWithBrowser(browser, BASE, { timeoutMs: HEALTH_TIMEOUT_MS });
} catch (error) {
  await browser.close();
  console.error('\n  qa:runtime 사전 확인 실패\n');
  console.error(`  ${error.message}\n`);
  process.exit(2);
}

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
    } catch (error) {
      return {
        brand: `${brand}(직접)`,
        route,
        errs: errs.filter(e => !/hydrat/i.test(e)),
        hyd: errs.filter(e => /hydrat/i.test(e)),
        consoleErrs,
        hasContent: false,
        fatal: fatalMessage(error),
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
  } catch (error) {
    return {
      brand,
      route,
      errs: errs.filter(e => !/hydrat/i.test(e)),
      hyd: errs.filter(e => /hydrat/i.test(e)),
      consoleErrs,
      hasContent: false,
      fatal: fatalMessage(error),
    };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}

async function seedDynamicRouteFixtures(page) {
  await page.goto(routeUrl(BASE, '/note'), { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
  await page.evaluate(
    ({ dbName, now }) =>
      new Promise((resolve, reject) => {
        const openReq = indexedDB.open(dbName);
        openReq.onerror = () => reject(openReq.error);
        openReq.onsuccess = () => {
          const db = openReq.result;
          try {
            for (const { store } of [{ store: 'menu_dev_notes' }, { store: 'sample_records' }]) {
              if (!db.objectStoreNames.contains(store)) {
                throw new Error(`${store} store missing`);
              }
            }
            const tx = db.transaction(['menu_dev_notes', 'sample_records'], 'readwrite');
            tx.objectStore('menu_dev_notes').put({
              id: 900001,
              brand: 'main',
              title: 'QA 동적 노트',
              menuName: 'QA 메뉴',
              category: '피자',
              noteType: '테스트',
              status: '아이디어',
              testContent: '동적 라우트 QA fixture',
              testDate: now.slice(0, 10),
              materials: '',
              tasteEval: '',
              managerEval: '',
              costNote: '',
              improvements: '',
              issues: '',
              nextAction: '',
              reportSummary: '',
              tags: 'qa',
              parentId: null,
              tempCostCalc: null,
              linkedSampleId: null,
              photos: [],
              boardOrder: null,
              createdAt: now,
              updatedAt: now,
            });
            tx.objectStore('sample_records').put({
              id: 900001,
              brand: 'main',
              title: 'QA 동적 샘플',
              sampleNames: ['QA 샘플'],
              menuName: 'QA 샘플',
              category: '피자',
              testDate: now.slice(0, 10),
              company: 'QA',
              tester: 'QA',
              rating: 3,
              price: '',
              priceTaxType: 'incl',
              description: '동적 샘플 QA fixture',
              result: '',
              improvements: '',
              nextAction: '',
              tags: 'qa',
              photos: [],
              linkedNoteId: null,
              linkedProducts: [],
              createdAt: now,
              updatedAt: now,
            });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
            tx.onabort = () => {
              db.close();
              reject(tx.error || new Error('dynamic fixture transaction aborted'));
            };
          } catch (error) {
            db.close();
            reject(error);
          }
        };
      }),
    { dbName: DB_NAME, now: new Date().toISOString() }
  );
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

// 동적 상세 라우트 — seed fixture 후 직접 진입
{
  const ctx = await newAuthedContext(browser, {}, BASE);
  const page = await ctx.newPage();
  try {
    await seedDynamicRouteFixtures(page);
    for (const { route } of DYNAMIC_FIXTURE_ROUTES) {
      results.push(await checkRoute(page, 'main(fixture)', route));
    }
  } catch (error) {
    for (const { route } of DYNAMIC_FIXTURE_ROUTES) {
      results.push({
        brand: 'main(fixture)',
        route,
        errs: [],
        hyd: [],
        consoleErrs: [],
        hasContent: false,
        fatal: fatalMessage(error),
      });
    }
  } finally {
    await page.close();
    await ctx.close();
  }
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
    !r.fatal &&
    r.errs.length === 0 &&
    r.hyd.length === 0 &&
    r.consoleErrs.length === 0 &&
    r.hasContent;
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
    if (r.fatal) console.log('    fatal: ' + r.fatal.slice(0, 100));
    if (!r.hasContent) console.log('    빈 화면 (h1/main 없음)');
    for (const e of [...r.errs, ...r.hyd, ...r.consoleErrs].slice(0, 3))
      console.log('    ' + e.slice(0, 100));
  }
  process.exitCode = 1;
}
