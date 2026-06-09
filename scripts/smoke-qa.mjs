/**
 * scripts/smoke-qa.mjs — 대표 라우트 스모크 QA
 *
 * dev 서버(localhost:3000)가 떠 있는 상태에서 실행:
 *   npm run qa:smoke
 *
 * 각 라우트에서 검사:
 *   - h1(제목) 존재
 *   - main 엘리먼트 존재
 *   - 콘솔 error / pageerror 없음
 *   - 가로 스크롤 없음 (documentElement.scrollWidth <= innerWidth)
 *   - 화면에 에러 문구('Application error', 'Unhandled', '오류가') 없음
 *   - 영구 로딩 없음 ('로딩 중'·'불러오는 중'이 본문에 남아있지 않음)
 *
 * 데이터 변경(업로드·저장·복원·초기화)은 일절 하지 않음 — 읽기 전용 순회.
 * IndexedDB가 비어 있어도(빈 데이터) 통과해야 정상 — 빈 상태 UI 검증 목적.
 */
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import {
  cell,
  isNextStaticAsset404,
  isSmokePass,
  resourcePathOf,
  splitConsoleErrors,
} from './smoke-qa-utils.mjs';

const BASE = getQaBase();
const VIEWPORT = { width: 702, height: 900 }; // 좁은 폭(가로 스크롤 검출용) 기준

// 대표 라우트 — 모듈별 진입 화면
const ROUTES = [
  ['홈', '/'],
  ['메뉴 판매량', '/menu-sales/rank'],
  ['판매 설정', '/menu-sales/settings'],
  ['제때상품관리', '/jette/price-compare'],
  ['식자재 관리', '/ingredient/manage'],
  ['식자재 사용현황', '/ingredient/usage'],
  ['메뉴 마스터', '/menu-master'],
  ['원가 마진표', '/cost/margin'],
  ['종합 원가', '/cost/all-summary'],
  ['사이드 원가', '/cost/side'],
  ['엣지·도우', '/cost/edge-dough'],
  ['원산지', '/nutrition/origin'],
  ['알레르기', '/nutrition/allergen'],
  ['노트 목록', '/note'],
  ['노트 작성', '/note/write'],
  ['칸반 보드', '/note/board'],
  ['일정 달력', '/note/calendar'],
  ['샘플 기록', '/note/sample'],
  ['보고서센터', '/report'],
  ['원가 보고서', '/report/cost'],
  ['설정/백업', '/settings/backup'],
  ['데이터 복원', '/settings/restore'],
];

const LOADING_MARKERS = ['로딩 중', '불러오는 중'];
const ERROR_MARKERS = ['Application error', 'Unhandled Runtime', 'client-side exception'];

async function main() {
  const browser = await chromium.launch();
  const ctx = await newAuthedContext(
    browser,
    {
      viewport: VIEWPORT,
    },
    BASE
  );
  const results = [];

  for (const [name, path] of ROUTES) {
    const page = await ctx.newPage();
    const consoleErrors = [];
    const nextStatic404Urls = [];
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
    page.on('response', r => {
      if (isNextStaticAsset404(r.url(), r.status())) {
        nextStatic404Urls.push(r.url());
        return;
      }
      if (r.status() >= 500)
        consoleErrors.push(`HTTP${r.status()} ${resourcePathOf(r.url()).slice(0, 40)}`);
    });

    const row = {
      name,
      path,
      h1: false,
      main: false,
      overflow: false,
      loading: false,
      errText: false,
      errs: 0,
    };
    try {
      await page.goto(routeUrl(BASE, path), { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2500); // 데이터 로드·렌더 대기

      const probe = await page.evaluate(
        markers => {
          const { loadingMarkers, errorMarkers } = markers;
          const bodyText = document.body.innerText || '';
          return {
            h1: !!document.querySelector('h1'),
            main: !!document.querySelector('main'),
            overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            scrollW: document.documentElement.scrollWidth,
            innerW: window.innerWidth,
            loading: loadingMarkers.some(m => bodyText.includes(m)),
            errText: errorMarkers.some(m => bodyText.includes(m)),
          };
        },
        { loadingMarkers: LOADING_MARKERS, errorMarkers: ERROR_MARKERS }
      );

      row.h1 = probe.h1;
      row.main = probe.main;
      row.overflow = probe.overflow;
      row.scrollW = probe.scrollW;
      row.innerW = probe.innerW;
      row.loading = probe.loading;
      row.errText = probe.errText;
      const splitErrors = splitConsoleErrors(consoleErrors, {
        ignorableNextStatic404Count: nextStatic404Urls.length,
      });

      row.errs = splitErrors.relevant.length;
      row.errSamples = splitErrors.relevant.slice(0, 2);
      row.ignoredErrs = splitErrors.ignored.length;
      row.ignoredSamples = nextStatic404Urls.slice(0, 2).map(resourcePathOf);
    } catch (e) {
      row.fatal = e.message;
    }
    await page.close();
    results.push(row);
  }
  await browser.close();

  // ── 출력: 표 ──
  console.log('\n  스모크 QA 결과 (viewport ' + VIEWPORT.width + 'px)\n');
  console.log('  결과  라우트              h1 main 가로 로딩 에러 콘솔  경로');
  console.log('  ' + '─'.repeat(78));
  for (const r of results) {
    const ok = isSmokePass(r);
    const mark = r.fatal ? '💥FAIL' : ok ? '✅PASS' : '❌FAIL';
    const nm = r.name.padEnd(14, ' ');
    console.log(
      `  ${mark}  ${nm}  ${cell(r.h1)}   ${cell(r.main)}   ${r.overflow ? '⚠' : '·'}    ${r.loading ? '⚠' : '·'}    ${r.errText ? '⚠' : '·'}   ${String(r.errs).padStart(2)}   ${r.path}`
    );
    if (r.fatal) console.log(`         └ 치명: ${r.fatal}`);
    if (r.overflow)
      console.log(`         └ 가로스크롤: scrollWidth ${r.scrollW} > innerWidth ${r.innerW}`);
    if (r.errs > 0) console.log(`         └ 콘솔: ${JSON.stringify(r.errSamples)}`);
    if (r.ignoredErrs > 0)
      console.log(
        `         └ 무시: Next dev 정적 리소스 404 ${r.ignoredErrs}건 ${JSON.stringify(r.ignoredSamples)}`
      );
  }
  console.log('  ' + '─'.repeat(78));
  const passed = results.filter(isSmokePass).length;
  console.log(`\n  ${passed}/${results.length} 통과\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(e => {
  console.error('smoke-qa 실행 실패:', e);
  process.exit(2);
});
