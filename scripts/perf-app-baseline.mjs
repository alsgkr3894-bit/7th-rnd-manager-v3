/**
 * scripts/perf-app-baseline.mjs — 실데이터 크기에서 화면 속도·조회 횟수·메모리 기준을 잰다.
 *
 *   npm run baseline:perf              # 약 15분. 결과 .baseline/perf-baseline.json
 *   npm run baseline:perf -- --smoke   # 같은 서버에서 스모크 QA도 실행
 *
 * 운영 DB를 쓰지 않는다: 최신 DB 백업을 임시 클러스터에 복원(db:restore:verify)하고,
 * 별도 빌드(.next-perf)를 쓰기 거부 상태로 띄워 새 브라우저에 데이터를 불러온 뒤 측정한다.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir, totalmem } from 'node:os';
import { join, resolve } from 'node:path';

import { TARGETS, formatRow, summarizeRuns } from './perf-app-baseline-core.mjs';
import { chromium, loginQaContext } from './qa-browser-utils.mjs';

const ROOT = process.cwd();
const PORT = 3102;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = '.next-perf';
const RUNS = 3;
// menu: 사이드바에서 누르는 이름 (없으면 화면 이동 측정에서 뺀다)
// ready: 화면이 떴다고 볼 조건 (제목, 데이터 행 수 초과, 본문 글자 수 초과)
const ROUTES = [
  { path: '/', label: '홈', menu: '홈', ready: { chars: 200, marker: '오늘 할 일' } },
  {
    path: '/menu-master',
    label: '메뉴마스터',
    menu: '메뉴 마스터',
    ready: { title: '메뉴 마스터', rows: 20 },
  },
  {
    path: '/ingredient/manage',
    label: '식자재 관리',
    menu: '식자재 관리',
    ready: { title: '식자재 관리', rows: 20 },
  },
  {
    path: '/cost/margin',
    label: '원가마진표',
    menu: '원가마진표',
    ready: { title: '원가마진표', rows: 20 },
  },
  { path: '/report/cost', label: '원가 보고서', ready: { title: '원가 보고서', rows: 20 } },
  {
    path: '/note',
    label: '노트 목록',
    menu: '노트 목록',
    ready: { title: '메뉴개발노트', chars: 1500 },
  },
];
const NAV_ROUTES = ROUTES.filter(route => route.menu);

const next = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const log = message => console.log(message);

function runNode(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`실패: node ${args.join(' ')}`);
}

/**
 * 화면이 읽을 수 있는 상태가 될 때까지 — 그 화면의 제목과 실제 데이터가 보여야 한다.
 * 로딩 자리표시자도 몇 행짜리 표라서, 표 화면은 데이터 행 수로 판정한다.
 */
async function waitReady(page, route) {
  await page.waitForFunction(
    ({ title, rows, chars, marker }) => {
      if (document.querySelector('.home-skeleton')) return false;
      const main = document.querySelector('main');
      const body = main?.innerText || '';
      if (marker && !body.includes(marker)) return false;
      if (/로딩 중|불러오는 중/.test(body)) return false;
      if (title && !document.querySelector('h1')?.textContent.includes(title)) return false;
      if (rows && document.querySelectorAll('main table tbody tr').length <= rows) return false;
      if (chars && body.length <= chars) return false;
      return true;
    },
    route.ready,
    { timeout: 120_000, polling: 20 }
  );
}

async function measure(page, cdp, route, navigate) {
  await page.evaluate(() => (window.__getAll = {})).catch(() => {});
  const started = Date.now();
  await navigate();
  await page.waitForURL(url => url.pathname === route.path, { timeout: 60_000 });
  await waitReady(page, route);
  const ms = Date.now() - started;
  // 화면이 뜬 뒤 이어지는 조회까지 센다
  await page.waitForTimeout(3000);
  const getAll = await page.evaluate(() => window.__getAll || {});
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const heap = metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value || 0;
  return { ms, getAll, heapMb: Math.round(heap / 1e5) / 10 };
}

async function measureAll(browser, password) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    window.__getAll = {};
    for (const [proto, nameOf] of [
      [IDBObjectStore.prototype, store => store.name],
      [IDBIndex.prototype, index => index.objectStore.name],
    ]) {
      const original = proto.getAll;
      proto.getAll = function counted(...args) {
        const name = nameOf(this);
        window.__getAll[name] = (window.__getAll[name] || 0) + 1;
        return original.apply(this, args);
      };
    }
  });
  await context.route('**/api/db/**', route =>
    route.request().method() === 'GET'
      ? route.continue()
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  );
  await loginQaContext(context, BASE, password);
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  let slowReads = 0;
  const errors = [];
  page.on('console', message => {
    if (/\[DB\] getAll\(.*ms/.test(message.text())) slowReads += 1;
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${BASE}/settings/sync`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  log('서버에서 불러오는 중 (약 5분)…');
  const hydrateStarted = Date.now();
  await page.getByRole('button', { name: '서버에서 불러오기' }).first().click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('v3:server-hydrate:last') || 'null')?.finishedAt,
    null,
    { timeout: 900_000, polling: 2000 }
  );
  await page.waitForTimeout(5000);
  const hydrate = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('v3:server-hydrate:last'))
  );
  const hydrateSeconds = Math.round((Date.now() - hydrateStarted) / 1000);
  if (!hydrate.ok) throw new Error('서버에서 불러오기에 실패했습니다.');
  log(`불러오기 ${hydrate.totalRows}행 · ${hydrateSeconds}초`);

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  slowReads = 0;

  const load = {};
  for (const route of ROUTES) {
    const runs = [];
    for (let i = 0; i < RUNS; i += 1) {
      runs.push(
        await measure(page, cdp, route, () =>
          page.goto(`${BASE}${route.path}`, { waitUntil: 'commit' })
        )
      );
    }
    load[route.path] = summarizeRuns(runs);
    log(
      formatRow(
        `새로 열기 ${route.label}`,
        load[route.path],
        route.path === '/' ? TARGETS.homeMs : 0
      )
    );
  }

  // 화면 이동 (이미 방문한 화면, 사이드바 링크)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const navigationRuns = {};
  const heapByRound = [];
  for (let round = 0; round < RUNS + 2; round += 1) {
    let lastHeap = 0;
    for (const route of [...NAV_ROUTES.slice(1), NAV_ROUTES[0]]) {
      const result = await measure(page, cdp, route, async () => {
        const selector =
          route.path === '/' ? '.sidebar button.nav-item' : '.sidebar button.nav-child';
        const button = page.locator(selector, { hasText: route.menu }).first();
        if ((await button.count()) === 0) throw new Error(`사이드바 항목 없음: ${route.menu}`);
        await button.dispatchEvent('click');
      });
      lastHeap = result.heapMb;
      // 첫 바퀴는 처음 방문(코드 받기)이라 이동 시간에서 뺀다
      if (round > 0 && round <= RUNS) (navigationRuns[route.path] ||= []).push(result);
    }
    heapByRound.push(lastHeap);
  }
  const navigation = {};
  for (const route of NAV_ROUTES) {
    navigation[route.path] = summarizeRuns(navigationRuns[route.path] || []);
    log(formatRow(`화면 이동 ${route.label}`, navigation[route.path], TARGETS.navigationMs));
  }
  log(`반복 이동 후 홈의 힙(MB): ${heapByRound.join(' → ')}`);
  log(`1초 넘는 전체 조회 경고 ${slowReads}회 · 화면 오류 ${errors.length}건`);
  await context.close();
  return {
    hydrate: { rows: hydrate.totalRows, seconds: hydrateSeconds },
    load,
    navigation,
    heapByRound,
    slowReads,
    errors,
  };
}

async function main() {
  const work = mkdtempSync(join(tmpdir(), 'rnd-perf-'));
  const envFile = join(work, 'restore.json');
  const verifyScript = join(ROOT, 'prisma', 'verify-db-restore.mjs');
  let server = null;
  let restored = false;
  let browser = null;
  try {
    runNode([verifyScript, '--keep', '--env-out', envFile]);
    restored = true;
    const { url } = JSON.parse(readFileSync(envFile, 'utf8'));
    runNode([next, 'build'], { NEXT_DIST_DIR: DIST });
    const password = `Perf-${randomBytes(12).toString('hex')}`;
    const env = {
      ...process.env,
      DATABASE_URL: url,
      NEXT_DIST_DIR: DIST,
      RND_SANDBOX_REJECT_WRITES: '1',
      RND_AUTH_STATE_PATH: join(work, 'auth.json'),
    };
    server = spawn(process.execPath, [next, 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
      cwd: ROOT,
      env,
      stdio: 'ignore',
    });
    for (let i = 0; i < 90; i += 1) {
      try {
        await fetch(`${BASE}/login`);
        break;
      } catch {
        await new Promise(done => setTimeout(done, 1000));
      }
    }
    browser = await chromium.launch();
    const result = await measureAll(browser, password);
    const report = {
      measuredAt: new Date().toISOString(),
      machine: {
        cpu: cpus()[0]?.model,
        cores: cpus().length,
        memoryGb: Math.round(totalmem() / 1e9),
      },
      runs: RUNS,
      ...result,
    };
    mkdirSync(resolve(ROOT, '.baseline'), { recursive: true });
    writeFileSync(
      resolve(ROOT, '.baseline', 'perf-baseline.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8'
    );
    log('저장: .baseline/perf-baseline.json');
    if (process.argv.includes('--smoke')) {
      const smoke = spawnSync(process.execPath, [join(ROOT, 'scripts', 'smoke-qa.mjs')], {
        cwd: ROOT,
        env: { ...process.env, BASE, QA_PASSWORD: password },
        stdio: 'inherit',
      });
      log(`스모크 QA 종료코드 ${smoke.status}`);
      if (smoke.status !== 0) process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    server?.kill();
    if (restored) runNode([verifyScript, '--cleanup', envFile]);
    rmSync(work, { recursive: true, force: true });
    rmSync(resolve(ROOT, DIST), { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
