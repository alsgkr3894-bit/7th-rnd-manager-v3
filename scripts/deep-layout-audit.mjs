import { writeFileSync } from 'node:fs';
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  CHINA4_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
} from '../lib/navigation/route-classification.js';

const BASE = getQaBase();
const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 900 },
  { name: 'mobile-390', width: 390, height: 900 },
  { name: 'tablet-768', width: 768, height: 1000 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

const ROUTE_GROUPS = [
  ...MAIN_RUNTIME_ROUTES.map(route => ({ brand: 'main', route })),
  ...CHINA4_RUNTIME_ROUTES.map(route => ({ brand: 'china4', route })),
  ...CHINA4_DIRECT_RUNTIME_ROUTES.map(route => ({ brand: 'china4-direct', route })),
];

const IGNORE_CONSOLE = [
  /React DevTools/i,
  /ResizeObserver/i,
  /Download the React/i,
  /extension/i,
  /chrome-extension/i,
];

function relevantConsole(text) {
  return !IGNORE_CONSOLE.some(pattern => pattern.test(text));
}

function short(text = '') {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 80);
}

async function probePage(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const bodyText = document.body?.innerText || '';
    const visible = el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= vh &&
        rect.left <= vw
      );
    };
    const labelOf = el => {
      const tag = el.tagName.toLowerCase();
      const cls = typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 3).join('.') : '';
      const attr =
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.getAttribute('title') ||
        el.getAttribute('href') ||
        '';
      const text = (el.innerText || el.value || '').replace(/\s+/g, ' ').trim();
      return `${tag}${cls ? `.${cls}` : ''}${attr ? ` [${attr}]` : ''}${text ? ` "${text.slice(0, 60)}"` : ''}`;
    };
    const all = [...document.querySelectorAll('body *')].filter(visible);
    const overflowElements = all
      .map(el => {
        const r = el.getBoundingClientRect();
        const left = Math.floor(r.left);
        const right = Math.ceil(r.right);
        const overLeft = Math.max(0, -left);
        const overRight = Math.max(0, right - vw);
        return {
          label: labelOf(el),
          left,
          right,
          width: Math.round(r.width),
          overLeft,
          overRight,
        };
      })
      .filter(item => item.overLeft > 1 || item.overRight > 1)
      .sort((a, b) => b.overRight + b.overLeft - (a.overRight + a.overLeft))
      .slice(0, 8);

    const controls = [
      ...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="link"]'),
    ].filter(visible);
    const smallControls = controls
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          label: labelOf(el),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      })
      .filter(item => item.width < 28 || item.height < 28)
      .slice(0, 12);

    const clippedControls = controls
      .filter(el => {
        const style = getComputedStyle(el);
        const text = (el.innerText || el.value || '').trim();
        return (
          text.length > 1 &&
          el.scrollWidth > el.clientWidth + 2 &&
          style.overflow !== 'visible' &&
          style.whiteSpace !== 'normal'
        );
      })
      .map(el => ({
        label: labelOf(el),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }))
      .slice(0, 8);

    const rects = controls.map((el, idx) => {
      const r = el.getBoundingClientRect();
      return { idx, label: labelOf(el), left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
    const overlaps = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const area = x * y;
        if (area > 120) {
          const aContainsB =
            a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom;
          const bContainsA =
            b.left <= a.left && b.top <= a.top && b.right >= a.right && b.bottom >= a.bottom;
          if (!aContainsB && !bContainsA) overlaps.push({ a: a.label, b: b.label, area: Math.round(area) });
        }
      }
      if (overlaps.length >= 8) break;
    }

    return {
      h1: Boolean(document.querySelector('h1')),
      main: Boolean(document.querySelector('main')),
      scrollWidth: doc.scrollWidth,
      innerWidth: vw,
      horizontalOverflow: doc.scrollWidth > vw + 1,
      loadingMarkers: ['로딩 중', '불러오는 중'].filter(marker => bodyText.includes(marker)),
      errorMarkers: ['Application error', 'Unhandled Runtime', 'client-side exception'].filter(marker =>
        bodyText.includes(marker)
      ),
      overflowElements,
      smallControls,
      clippedControls,
      overlaps,
    };
  });
}

async function checkRoute(browser, routeInfo, viewport) {
  const ctx = await newAuthedContext(browser, { viewport }, BASE);
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const httpProblems = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && relevantConsole(msg.text())) consoleErrors.push(short(msg.text()));
  });
  page.on('pageerror', err => pageErrors.push(short(err.message)));
  page.on('response', response => {
    const status = response.status();
    if (status >= 500) httpProblems.push(`${status} ${new URL(response.url()).pathname}`);
  });

  try {
    await page.addInitScript(
      brand => localStorage.setItem('v3:active-brand', brand === 'china4-direct' ? 'china4' : brand),
      routeInfo.brand
    );
    const response = await page.goto(routeUrl(BASE, routeInfo.route), {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    await page.waitForSelector('main, h1', { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    const probe = await probePage(page);
    return {
      ...routeInfo,
      viewport: viewport.name,
      width: viewport.width,
      status: response?.status() ?? null,
      consoleErrors: consoleErrors.slice(0, 5),
      pageErrors: pageErrors.slice(0, 5),
      httpProblems: httpProblems.slice(0, 5),
      ...probe,
    };
  } catch (error) {
    return {
      ...routeInfo,
      viewport: viewport.name,
      width: viewport.width,
      fatal: short(error.message || String(error)),
      consoleErrors: consoleErrors.slice(0, 5),
      pageErrors: pageErrors.slice(0, 5),
      httpProblems: httpProblems.slice(0, 5),
    };
  } finally {
    await ctx.close();
  }
}

function isProblem(result) {
  return (
    result.fatal ||
    result.status >= 500 ||
    !result.h1 ||
    !result.main ||
    result.horizontalOverflow ||
    result.loadingMarkers?.length ||
    result.errorMarkers?.length ||
    result.consoleErrors?.length ||
    result.pageErrors?.length ||
    result.httpProblems?.length ||
    result.overflowElements?.length ||
    result.clippedControls?.length ||
    result.overlaps?.length
  );
}

const browser = await chromium.launch();
const results = [];

try {
  for (const viewport of VIEWPORTS) {
    for (const routeInfo of ROUTE_GROUPS) {
      results.push(await checkRoute(browser, routeInfo, viewport));
    }
  }
} finally {
  await browser.close();
}

const problems = results.filter(isProblem);
const output = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  counts: {
    total: results.length,
    problems: problems.length,
    clean: results.length - problems.length,
  },
  problems,
  results,
};

const outPath = process.env.DEEP_AUDIT_OUT || 'docs/deep-layout-audit-results-2026-07-02.json';
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`Deep layout audit: ${results.length} checks, ${problems.length} with findings`);
console.log(`Result file: ${outPath}`);

const grouped = new Map();
for (const problem of problems) {
  const key = `${problem.brand} ${problem.route}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(problem);
}
for (const [key, items] of [...grouped.entries()].slice(0, 40)) {
  const labels = items.map(item => item.viewport).join(', ');
  const first = items[0];
  console.log(`- ${key} @ ${labels}`);
  if (first.fatal) console.log(`  fatal: ${first.fatal}`);
  if (first.horizontalOverflow) console.log(`  overflow: ${first.scrollWidth} > ${first.innerWidth}`);
  if (first.overflowElements?.[0]) console.log(`  offender: ${first.overflowElements[0].label}`);
  if (first.clippedControls?.[0]) console.log(`  clipped: ${first.clippedControls[0].label}`);
  if (first.consoleErrors?.[0]) console.log(`  console: ${first.consoleErrors[0]}`);
}

if (problems.length > 0) process.exitCode = 1;
