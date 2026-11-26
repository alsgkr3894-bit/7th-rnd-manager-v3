import { createHash } from 'node:crypto';
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

const sha256 = text => createHash('sha256').update(text).digest('hex');

/**
 * 서버 세션 로그인 — 2026-11 서버 인증 도입 뒤에는 이 쿠키가 없으면 업무 화면이 열리지 않는다.
 * 검증용 서버(별도 RND_AUTH_STATE_PATH)에서만 쓴다. 인증이 비어 있으면 이 비밀번호로 설정한다.
 */
export async function loginQaContext(ctx, base, password) {
  const url = new URL('/api/auth/session', base).toString();
  const status = await (await ctx.request.get(url)).json();
  const verifier = sha256(password);
  const data = status.configured
    ? { challengeId: status.id, response: sha256(`${verifier}:${status.nonce}`) }
    : { verifier };
  const response = await ctx.request.post(url, { data });
  if (!response.ok()) throw new Error(`QA 로그인 실패 (HTTP ${response.status()})`);
}

export async function newAuthedContext(browser, options = {}, base = getQaBase()) {
  const ctx = await browser.newContext(options);
  await ctx.addCookies([authCookie(base)]);
  if (process.env.QA_PASSWORD) await loginQaContext(ctx, base, process.env.QA_PASSWORD);
  return ctx;
}
