/**
 * scripts/perf-baseline.mjs — 프로덕션 빌드 기준 성능 기준선(FCP·LCP·CLS·긴 작업·전송량).
 *
 * Lighthouse를 개발 서버(next dev)에 돌리면 개발용 번들·느린 회선 시뮬레이션 때문에 점수가
 * 실제와 5~10배 벌어진다. 반드시 프로덕션 빌드로 잰다. 데이터가 바뀌지 않도록 읽기 전용
 * 샌드박스 빌드를 쓴다:
 *
 *   NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY=1 NEXT_DIST_DIR=.next-sandbox npx next build
 *   NEXT_DIST_DIR=.next-sandbox RND_SANDBOX_REJECT_WRITES=1 npx next start -H 127.0.0.1 -p 3100
 *   BASE=http://127.0.0.1:3100 node scripts/perf-baseline.mjs [/ /cost/margin ...]
 *
 * 환경변수: MOBILE=1(모바일 뷰포트+CPU 4배 감속), WAIT_MS(로드 후 관찰 시간, 기본 6000),
 *           RUNS(반복 횟수, 기본 3 — 가운데 값 출력)
 */
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';

const base = getQaBase('http://127.0.0.1:3100');
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/cost/margin', '/note'];
const mobile = process.env.MOBILE === '1';
const waitMs = Number(process.env.WAIT_MS || 6000);
const runs = Number(process.env.RUNS || 3);

const INIT = `
  window.__perf = { cls: 0, shifts: [], lcp: 0, lcpEl: '', longTasks: 0, longMs: 0 };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__perf.cls += e.value;
      window.__perf.shifts.push({
        t: Math.round(e.startTime),
        v: +e.value.toFixed(4),
        el: (e.sources || []).slice(0, 2).map(s => {
          const n = s.node;
          return n ? (n.className && typeof n.className === 'string' ? n.tagName + '.' + n.className.split(' ')[0] : n.tagName) : '?';
        }),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      window.__perf.lcp = Math.round(e.startTime);
      window.__perf.lcpEl = e.element ? e.element.tagName + (e.element.className ? '.' + String(e.element.className).split(' ')[0] : '') : '';
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      window.__perf.longTasks += 1;
      window.__perf.longMs += Math.round(e.duration);
    }
  }).observe({ type: 'longtask', buffered: true });
`;

async function measure(browser, path) {
  const ctx = await newAuthedContext(
    browser,
    mobile
      ? { viewport: { width: 412, height: 823 }, deviceScaleFactor: 2, isMobile: true }
      : { viewport: { width: 1440, height: 900 } },
    base
  );
  const page = await ctx.newPage();
  if (mobile) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.addInitScript(INIT);
  await page.goto(routeUrl(base, path), { waitUntil: 'load' });
  await page.waitForTimeout(waitMs);
  const r = await page.evaluate(() => {
    const paint = Object.fromEntries(
      performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)])
    );
    const res = performance.getEntriesByType('resource');
    const bytes = res.reduce((n, e) => n + (e.transferSize || 0), 0);
    const font = res
      .filter(e => /\.woff2?/.test(e.name))
      .reduce((n, e) => n + (e.transferSize || 0), 0);
    const img = res
      .filter(e => /\.(png|jpe?g|webp|svg|ico)/.test(e.name))
      .reduce((n, e) => n + (e.transferSize || 0), 0);
    const js = res.filter(e => /\.js/.test(e.name)).reduce((n, e) => n + (e.transferSize || 0), 0);
    return {
      ...window.__perf,
      fcp: paint['first-contentful-paint'],
      bytes,
      font,
      img,
      js,
      reqs: res.length,
      dom: document.getElementsByTagName('*').length,
    };
  });
  await ctx.close();
  return r;
}

const browser = await chromium.launch();
console.log(`BASE=${base} ${mobile ? 'mobile(CPU x4)' : 'desktop'} runs=${runs} wait=${waitMs}ms`);
for (const path of routes) {
  const all = [];
  for (let i = 0; i < runs; i++) all.push(await measure(browser, path));
  all.sort((a, b) => a.cls - b.cls);
  const m = all[Math.floor(all.length / 2)];
  console.log(
    `${path.padEnd(16)} FCP ${m.fcp}ms  LCP ${m.lcp}ms(${m.lcpEl})  CLS ${m.cls.toFixed(3)}  긴작업 ${m.longTasks}건/${m.longMs}ms  ` +
      `전송 ${(m.bytes / 1024).toFixed(0)}KB(폰트 ${(m.font / 1024).toFixed(0)} JS ${(m.js / 1024).toFixed(0)} 이미지 ${(m.img / 1024).toFixed(0)}) 요청 ${m.reqs}  DOM ${m.dom}`
  );
  if (m.shifts.length) console.log('   시프트:', JSON.stringify(m.shifts.slice(0, 8)));
}
await browser.close();
