import { writeFileSync } from 'node:fs';
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  CHINA4_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
} from '../lib/navigation/route-classification.js';

const BASE = getQaBase();
const OUT =
  process.env.DEEP_LAYOUT_FILTERED_OUT || 'docs/deep-layout-filtered-audit-2026-07-02.json';
const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 900 },
  { name: 'mobile-390', width: 390, height: 900 },
  { name: 'tablet-768', width: 768, height: 1000 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

const ROUTES = [
  ...MAIN_RUNTIME_ROUTES.map(route => ({ brand: 'main', route })),
  ...CHINA4_RUNTIME_ROUTES.map(route => ({ brand: 'china4', route })),
  ...CHINA4_DIRECT_RUNTIME_ROUTES.map(route => ({ brand: 'china4-direct', route })),
];

const IGNORE_CONSOLE = [/React DevTools/i, /ResizeObserver/i, /Download the React/i, /extension/i];

function short(text = '') {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 140);
}

function relevantConsole(text) {
  return !IGNORE_CONSOLE.some(pattern => pattern.test(text));
}

async function probe(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ignoredSelector = [
      'aside.sidebar',
      '.sidebar',
      '.profile',
      '.skip-link',
      '[aria-hidden="true"]',
    ].join(',');
    const ignored = el => Boolean(el.closest(ignoredSelector));
    const viewportRect = () => ({ left: 0, top: 0, right: vw, bottom: vh });
    const intersects = rect => rect.right > rect.left && rect.bottom > rect.top;
    const intersectRect = (rect, clip, axis = 'both') => ({
      left: axis === 'y' ? rect.left : Math.max(rect.left, clip.left),
      top: axis === 'x' ? rect.top : Math.max(rect.top, clip.top),
      right: axis === 'y' ? rect.right : Math.min(rect.right, clip.right),
      bottom: axis === 'x' ? rect.bottom : Math.min(rect.bottom, clip.bottom),
    });
    const visibleRectFor = el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (
        !(
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        )
      ) {
        return null;
      }
      let visibleRect = intersectRect(rect, viewportRect());
      if (!intersects(visibleRect)) return null;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) continue;
        const parentStyle = getComputedStyle(parent);
        const clipX = /auto|scroll|hidden|clip/.test(parentStyle.overflowX);
        const clipY = /auto|scroll|hidden|clip/.test(parentStyle.overflowY);
        if (!clipX && !clipY) continue;
        const parentRect = parent.getBoundingClientRect();
        const axis = clipX && clipY ? 'both' : clipX ? 'x' : 'y';
        visibleRect = intersectRect(visibleRect, parentRect, axis);
        if (!intersects(visibleRect)) return null;
      }
      return visibleRect;
    };
    const visible = el => {
      const rect = visibleRectFor(el);
      return (
        rect &&
        rect.right > rect.left &&
        rect.bottom > rect.top &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= vh &&
        rect.left <= vw
      );
    };
    const label = el => {
      const tag = el.tagName.toLowerCase();
      const cls =
        typeof el.className === 'string'
          ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.')
          : '';
      const attr =
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.getAttribute('title') ||
        '';
      const text = (el.innerText || el.value || '').replace(/\s+/g, ' ').trim();
      return `${tag}${cls ? `.${cls}` : ''}${attr ? ` [${attr}]` : ''}${text ? ` "${text.slice(0, 80)}"` : ''}`;
    };

    const bodyText = document.body?.innerText || '';
    const all = [...document.querySelectorAll('body *')].filter(el => visible(el) && !ignored(el));
    const overflowElements = all
      .map(el => {
        const rect = visibleRectFor(el);
        const left = Math.floor(rect.left);
        const right = Math.ceil(rect.right);
        return {
          label: label(el),
          left,
          right,
          width: Math.round(rect.right - rect.left),
          overLeft: Math.max(0, -left),
          overRight: Math.max(0, right - vw),
        };
      })
      .filter(item => item.overLeft > 1 || item.overRight > 1)
      .sort((a, b) => b.overLeft + b.overRight - (a.overLeft + a.overRight))
      .slice(0, 10);

    const controls = [
      ...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="link"]'),
    ].filter(el => visible(el) && !ignored(el));

    const clippedControls = controls
      .filter(el => {
        const style = getComputedStyle(el);
        const text = (el.innerText || el.value || '').trim();
        return (
          text.length > 1 && el.scrollWidth > el.clientWidth + 2 && style.overflow !== 'visible'
        );
      })
      .map(el => ({ label: label(el), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }))
      .slice(0, 10);

    const smallTextControls = controls
      .map(el => {
        const rect = visibleRectFor(el);
        return {
          label: label(el),
          width: Math.round(rect.right - rect.left),
          height: Math.round(rect.bottom - rect.top),
          text: (el.innerText || el.value || '').trim(),
        };
      })
      .filter(item => item.text.length > 1 && (item.width < 28 || item.height < 28))
      .slice(0, 10);

    const rects = controls.map(el => {
      const rect = visibleRectFor(el);
      return {
        label: label(el),
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    });
    const overlaps = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const area = x * y;
        if (area <= 120) continue;
        const contains =
          (a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom) ||
          (b.left <= a.left && b.top <= a.top && b.right >= a.right && b.bottom >= a.bottom);
        if (!contains) overlaps.push({ a: a.label, b: b.label, area: Math.round(area) });
        if (overlaps.length >= 10) break;
      }
      if (overlaps.length >= 10) break;
    }

    return {
      h1: Boolean(document.querySelector('h1')),
      main: Boolean(document.querySelector('main')),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: vw,
      loadingMarkers: ['로딩 중', '불러오는 중'].filter(marker => bodyText.includes(marker)),
      errorMarkers: ['Application error', 'Unhandled Runtime', 'client-side exception'].filter(
        marker => bodyText.includes(marker)
      ),
      overflowElements,
      clippedControls,
      smallTextControls,
      overlaps,
    };
  });
}

async function check(browser, routeInfo, viewport) {
  const ctx = await newAuthedContext(browser, { viewport }, BASE);
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const httpProblems = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && relevantConsole(msg.text()))
      consoleErrors.push(short(msg.text()));
  });
  page.on('pageerror', error => pageErrors.push(short(error.message)));
  page.on('response', response => {
    const status = response.status();
    if (status >= 500) httpProblems.push(`${status} ${new URL(response.url()).pathname}`);
  });
  try {
    await page.addInitScript(
      brand =>
        localStorage.setItem('v3:active-brand', brand === 'china4-direct' ? 'china4' : brand),
      routeInfo.brand
    );
    const response = await page.goto(routeUrl(BASE, routeInfo.route), {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    await page.waitForSelector('main, h1', { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
    return {
      ...routeInfo,
      viewport: viewport.name,
      width: viewport.width,
      status: response?.status() ?? null,
      consoleErrors: consoleErrors.slice(0, 5),
      pageErrors: pageErrors.slice(0, 5),
      httpProblems: httpProblems.slice(0, 5),
      ...(await probe(page)),
    };
  } catch (error) {
    return {
      ...routeInfo,
      viewport: viewport.name,
      width: viewport.width,
      status: null,
      fatal: short(error?.message || String(error)),
      consoleErrors: consoleErrors.slice(0, 5),
      pageErrors: pageErrors.slice(0, 5),
      httpProblems: httpProblems.slice(0, 5),
    };
  } finally {
    await ctx.close();
  }
}

function isProblem(result) {
  return Boolean(
    result.fatal ||
    result.status >= 500 ||
    !result.h1 ||
    !result.main ||
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
    for (const route of ROUTES) {
      results.push(await check(browser, route, viewport));
    }
  }
} finally {
  await browser.close();
}

const problems = results.filter(isProblem);
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  counts: {
    total: results.length,
    clean: results.length - problems.length,
    problems: problems.length,
  },
  problems,
  results,
};

writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Filtered layout audit: ${report.counts.clean}/${report.counts.total} clean`);
console.log(`Result file: ${OUT}`);
for (const problem of problems.slice(0, 40)) {
  console.log(`- ${problem.brand} ${problem.route} ${problem.viewport}`);
  if (problem.fatal) console.log(`  fatal: ${problem.fatal}`);
  if (problem.overflowElements?.[0])
    console.log(`  overflow: ${problem.overflowElements[0].label}`);
  if (problem.clippedControls?.[0]) console.log(`  clipped: ${problem.clippedControls[0].label}`);
  if (problem.overlaps?.[0])
    console.log(`  overlap: ${problem.overlaps[0].a} / ${problem.overlaps[0].b}`);
  if (problem.consoleErrors?.[0]) console.log(`  console: ${problem.consoleErrors[0]}`);
}

if (problems.length > 0) process.exitCode = 1;
