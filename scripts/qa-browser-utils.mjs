import pw from '../node_modules/playwright/index.js';

export const { chromium } = pw;

export function getQaBase(defaultBase = 'http://localhost:3000') {
  const raw = process.env.BASE || process.env.QA_BASE || defaultBase;
  return String(raw).replace(/\/+$/, '');
}

export function routeUrl(base, path) {
  return new URL(path, `${base}/`).toString();
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
