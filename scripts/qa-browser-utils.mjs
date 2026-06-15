import pw from '../node_modules/playwright/index.js';

export const { chromium } = pw;

export function getQaBase(defaultBase = 'http://localhost:3000') {
  const raw = process.env.BASE || process.env.QA_BASE || defaultBase;
  return String(raw).replace(/\/+$/, '');
}

export function routeUrl(base, path) {
  return new URL(path, `${base}/`).toString();
}

function healthCheckUrls(base) {
  const primary = routeUrl(base, '/');
  const urls = [primary];
  try {
    const fallback = new URL(primary);
    if (fallback.hostname === 'localhost') {
      fallback.hostname = '127.0.0.1';
      urls.push(fallback.toString());
    }
  } catch {}
  return urls;
}

export async function checkQaBaseReachable(
  base = getQaBase(),
  { timeoutMs = 5000, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'fetch unavailable' };
  }

  let lastFailure = null;
  for (const url of healthCheckUrls(base)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        redirect: 'manual',
        signal: controller.signal,
      });
      if (res.status < 500) return { ok: true, status: res.status, url };
      lastFailure = { ok: false, status: res.status, url };
    } catch (error) {
      lastFailure = { ok: false, error: error?.message || String(error), url };
    } finally {
      clearTimeout(timer);
    }
  }

  return lastFailure || { ok: false, error: 'unknown error' };
}

export async function assertQaBaseReachable(base = getQaBase(), options = {}) {
  const result = await checkQaBaseReachable(base, options);
  if (result.ok) return result;

  const detail = result.status ? `HTTP ${result.status}` : result.error || 'unknown error';
  const error = new Error(
    `QA 서버에 연결할 수 없습니다: ${base} (${detail}). dev 서버를 먼저 실행하거나 BASE/QA_BASE를 확인하세요.`
  );
  error.result = result;
  throw error;
}

export async function checkQaBaseReachableWithBrowser(
  browser,
  base = getQaBase(),
  { timeoutMs = 5000 } = {}
) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let lastFailure = null;

  try {
    for (const url of healthCheckUrls(base)) {
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: timeoutMs,
        });
        const status = response?.status?.() ?? 0;
        if (status < 500) return { ok: true, status, url: page.url() };
        lastFailure = { ok: false, status, url };
      } catch (error) {
        lastFailure = { ok: false, error: error?.message || String(error), url };
      }
    }
  } finally {
    await ctx.close();
  }

  return lastFailure || { ok: false, error: 'unknown error' };
}

export async function assertQaBaseReachableWithBrowser(browser, base = getQaBase(), options = {}) {
  const result = await checkQaBaseReachableWithBrowser(browser, base, options);
  if (result.ok) return result;

  const detail = result.status ? `HTTP ${result.status}` : result.error || 'unknown error';
  const error = new Error(
    `QA 서버에 연결할 수 없습니다: ${base} (${detail}). dev 서버를 먼저 실행하거나 BASE/QA_BASE를 확인하세요.`
  );
  error.result = result;
  throw error;
}

export function authCookie(base = getQaBase()) {
  return {
    name: 'v3:auth',
    value: '1',
    url: base,
    sameSite: 'Strict',
  };
}

export async function newAuthedContext(browser, options = {}, base = getQaBase()) {
  const ctx = await browser.newContext(options);
  await ctx.addCookies([authCookie(base)]);
  return ctx;
}
