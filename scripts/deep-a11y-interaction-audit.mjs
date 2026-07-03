import { writeFileSync } from 'node:fs';
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import {
  CHINA4_DIRECT_RUNTIME_ROUTES,
  CHINA4_RUNTIME_ROUTES,
  MAIN_RUNTIME_ROUTES,
} from '../lib/navigation/route-classification.js';

const BASE = getQaBase();
const OUT = process.env.DEEP_A11Y_INTERACTION_OUT || 'docs/deep-a11y-interaction-audit-2026-07-02.json';
const ROUTE_LIMIT = Number.parseInt(process.env.DEEP_A11Y_ROUTE_LIMIT || '', 10) || null;
const VIEWPORT_FILTER = new Set(
  String(process.env.DEEP_A11Y_VIEWPORTS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

const ALL_VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

const VIEWPORTS = VIEWPORT_FILTER.size
  ? ALL_VIEWPORTS.filter(viewport => VIEWPORT_FILTER.has(viewport.name))
  : ALL_VIEWPORTS;

const ALL_ROUTES = [
  ...MAIN_RUNTIME_ROUTES.map(route => ({ brand: 'main', route })),
  ...CHINA4_RUNTIME_ROUTES.map(route => ({ brand: 'china4', route })),
  ...CHINA4_DIRECT_RUNTIME_ROUTES.map(route => ({ brand: 'china4-direct', route })),
];
const ROUTES = ROUTE_LIMIT ? ALL_ROUTES.slice(0, ROUTE_LIMIT) : ALL_ROUTES;

const IGNORE_CONSOLE = [/React DevTools/i, /ResizeObserver/i, /Download the React/i, /extension/i];

function short(text = '') {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 180);
}

function relevantConsole(text) {
  return !IGNORE_CONSOLE.some(pattern => pattern.test(text));
}

function responsePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return short(url);
  }
}

const results = [];

function hasFinding(result) {
  return Boolean(
    result.fatal ||
      result.status >= 500 ||
      !result.h1 ||
      !result.main ||
      result.overflowX ||
      result.consoleErrors?.length ||
      result.pageErrors?.length ||
      result.httpProblems?.length ||
      result.duplicateIds?.length ||
      result.unlabeledControls?.length ||
      result.buttonsWithoutTypeInForms?.length ||
      result.invalidAriaRefs?.length ||
      result.positiveTabIndex?.length ||
      result.tinyControls?.length
  );
}

function buildReport({ completed = false, fatal = null } = {}) {
  const findings = results.filter(hasFinding);
  return {
    generatedAt: new Date().toISOString(),
    base: BASE,
    completed,
    fatal,
    routeCount: ROUTES.length,
    viewportCount: VIEWPORTS.length,
    counts: {
      total: results.length,
      expected: ROUTES.length * VIEWPORTS.length,
      clean: results.length - findings.length,
      findings: findings.length,
    },
    summary: {
      duplicateIdRoutes: findings.filter(item => item.duplicateIds?.length).length,
      unlabeledControlRoutes: findings.filter(item => item.unlabeledControls?.length).length,
      missingButtonTypeRoutes: findings.filter(item => item.buttonsWithoutTypeInForms?.length).length,
      invalidAriaRefRoutes: findings.filter(item => item.invalidAriaRefs?.length).length,
      positiveTabIndexRoutes: findings.filter(item => item.positiveTabIndex?.length).length,
      tinyControlRoutes: findings.filter(item => item.tinyControls?.length).length,
      overflowRoutes: findings.filter(item => item.overflowX).length,
      runtimeErrorRoutes: findings.filter(
        item => item.fatal || item.consoleErrors?.length || item.pageErrors?.length || item.httpProblems?.length
      ).length,
    },
    findings,
    results,
  };
}

function writeReport(options = {}) {
  writeFileSync(OUT, `${JSON.stringify(buildReport(options), null, 2)}\n`, 'utf8');
}

function recordFatal(prefix, error) {
  const fatal = `${prefix}: ${short(error?.stack || error?.message || String(error))}`;
  try {
    writeReport({ completed: false, fatal });
  } catch {}
  console.error(fatal);
}

process.on('uncaughtException', error => {
  recordFatal('uncaughtException', error);
  process.exit(1);
});

process.on('unhandledRejection', error => {
  recordFatal('unhandledRejection', error);
  process.exit(1);
});

async function probePage(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visible = el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= vh &&
        rect.left <= vw &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const cssName = el => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls =
        typeof el.className === 'string'
          ? el.className
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(name => `.${name}`)
              .join('')
          : '';
      return `${tag}${id}${cls}`;
    };
    const labelFor = el => {
      const own =
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.getAttribute('placeholder') ||
        el.getAttribute('alt') ||
        el.getAttribute('value') ||
        '';
      if (clean(own)) return clean(own);
      if (el.id) {
        const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicit && clean(explicit.innerText)) return clean(explicit.innerText);
      }
      const wrappingLabel = el.closest('label');
      if (wrappingLabel && clean(wrappingLabel.innerText)) return clean(wrappingLabel.innerText);
      const svgTitle = el.querySelector?.('svg title');
      if (svgTitle && clean(svgTitle.textContent)) return clean(svgTitle.textContent);
      return clean(el.innerText || el.textContent || '');
    };
    const describe = el => {
      const rect = el.getBoundingClientRect();
      const label = labelFor(el);
      return {
        selector: cssName(el),
        label: label.slice(0, 100),
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    const ids = new Map();
    for (const el of document.querySelectorAll('[id]')) {
      ids.set(el.id, (ids.get(el.id) || 0) + 1);
    }
    const duplicateIds = [...ids.entries()]
      .filter(([id, count]) => id && count > 1)
      .map(([id, count]) => ({ id, count }))
      .slice(0, 20);

    const allControls = [
      ...document.querySelectorAll(
        'button,a[href],input,select,textarea,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="combobox"]'
      ),
    ].filter(el => visible(el) && !el.closest('[aria-hidden="true"]') && !el.closest('.skip-link'));

    const unlabeledControls = allControls
      .filter(el => {
        if (el.matches('input[type="hidden"]')) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if (el.hasAttribute('disabled')) return false;
        return !labelFor(el);
      })
      .map(describe)
      .slice(0, 20);

    const buttonsWithoutTypeInForms = [...document.querySelectorAll('form button:not([type])')]
      .filter(visible)
      .map(describe)
      .slice(0, 20);

    const invalidAriaRefs = [];
    for (const el of document.querySelectorAll('[aria-labelledby],[aria-describedby]')) {
      for (const attr of ['aria-labelledby', 'aria-describedby']) {
        const value = el.getAttribute(attr);
        if (!value) continue;
        const missing = value
          .split(/\s+/)
          .filter(Boolean)
          .filter(id => !document.getElementById(id));
        if (missing.length) {
          invalidAriaRefs.push({ element: cssName(el), attr, missing });
        }
      }
      if (invalidAriaRefs.length >= 20) break;
    }

    const positiveTabIndex = [...document.querySelectorAll('[tabindex]')]
      .filter(el => visible(el) && Number.parseInt(el.getAttribute('tabindex') || '0', 10) > 0)
      .map(el => ({ ...describe(el), tabIndex: el.getAttribute('tabindex') }))
      .slice(0, 20);

    const tinyControls = allControls
      .map(describe)
      .filter(item => item.width < 24 || item.height < 24)
      .slice(0, 20);

    return {
      title: document.title,
      h1: Boolean(document.querySelector('h1')),
      main: Boolean(document.querySelector('main')),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: vw,
      overflowX: document.documentElement.scrollWidth > vw + 1,
      controlCount: allControls.length,
      duplicateIds,
      unlabeledControls,
      buttonsWithoutTypeInForms,
      invalidAriaRefs,
      positiveTabIndex,
      tinyControls,
    };
  });
}

async function check(browser, routeInfo, viewport) {
  const ctx = await newAuthedContext(browser, { viewport }, BASE);
  await ctx.addInitScript(
    brand => localStorage.setItem('v3:active-brand', brand === 'china4-direct' ? 'china4' : brand),
    routeInfo.brand
  );
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const httpProblems = [];

  page.on('console', message => {
    if (message.type() === 'error' && relevantConsole(message.text())) {
      consoleErrors.push(short(message.text()));
    }
  });
  page.on('pageerror', error => pageErrors.push(short(error.message)));
  page.on('response', response => {
    if (response.status() >= 500) {
      httpProblems.push(`${response.status()} ${responsePath(response.url())}`);
    }
  });

  try {
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
      ...(await probePage(page)),
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

const browser = await chromium.launch();
try {
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      results.push(await check(browser, route, viewport));
      writeReport({ completed: false });
    }
  }
} finally {
  await browser.close();
}

writeReport({ completed: true });
const report = buildReport({ completed: true });
const findings = report.findings;

console.log(`Deep a11y/interaction audit: ${report.counts.clean}/${report.counts.total} clean`);
console.log(`Result file: ${OUT}`);
for (const finding of findings.slice(0, 50)) {
  console.log(`- ${finding.brand} ${finding.route} ${finding.viewport}`);
  if (finding.fatal) console.log(`  fatal: ${finding.fatal}`);
  if (finding.overflowX) console.log(`  overflow: scrollWidth ${finding.scrollWidth} > ${finding.innerWidth}`);
  if (finding.duplicateIds?.[0]) console.log(`  duplicate id: ${finding.duplicateIds[0].id}`);
  if (finding.unlabeledControls?.[0]) console.log(`  unlabeled: ${finding.unlabeledControls[0].selector}`);
  if (finding.buttonsWithoutTypeInForms?.[0]) console.log(`  form button missing type: ${finding.buttonsWithoutTypeInForms[0].selector}`);
  if (finding.invalidAriaRefs?.[0]) console.log(`  aria ref: ${JSON.stringify(finding.invalidAriaRefs[0])}`);
  if (finding.tinyControls?.[0]) console.log(`  tiny: ${finding.tinyControls[0].selector}`);
}

if (findings.length > 0) process.exitCode = 1;
