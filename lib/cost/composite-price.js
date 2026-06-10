/**
 * lib/cost/composite-price.js — compositeOf 합산 단가 정책
 *
 * strict: 모든 구성품 가격이 있을 때만 합산한다. 원가 계산처럼 과소계산을 피해야 하는 곳에서 사용.
 * partial: 가격이 있는 구성품만 합산한다. 단가표처럼 참고 가격을 계속 보여줄 때 사용.
 */

function normalizeCode(code) {
  return String(code ?? '').trim();
}

function normalizeKey(code) {
  return normalizeCode(code).toLowerCase();
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildLookup(priceLookup) {
  const map = new Map();
  if (!(priceLookup instanceof Map)) return map;
  for (const [key, row] of priceLookup.entries()) {
    const normalized = normalizeKey(key);
    if (normalized && !map.has(normalized)) map.set(normalized, row);
  }
  return map;
}

function readPrice(priceLookup, normalizedLookup, code) {
  const exactCode = normalizeCode(code);
  const row =
    priceLookup?.get?.(code) ??
    priceLookup?.get?.(exactCode) ??
    normalizedLookup.get(normalizeKey(exactCode)) ??
    null;
  return normalizePrice(row?.priceWithTax);
}

/**
 * compositeOf 구성품 가격을 하나의 정책으로 해석한다.
 *
 * @param {string[]} compositeOf
 * @param {Map<string, { priceWithTax: number|string }>} priceLookup
 * @param {{ mode?: 'strict'|'partial' }} options
 * @returns {{
 *   priceWithTax: number|null,
 *   mode: 'strict'|'partial',
 *   isComposite: boolean,
 *   isComplete: boolean,
 *   missingCodes: string[],
 *   pricedCodes: string[]
 * }}
 */
export function resolveCompositePrice(compositeOf, priceLookup, options = {}) {
  const mode = options.mode === 'partial' ? 'partial' : 'strict';
  const codes = Array.isArray(compositeOf) ? compositeOf.map(normalizeCode).filter(Boolean) : [];
  if (codes.length === 0) {
    return {
      priceWithTax: null,
      mode,
      isComposite: false,
      isComplete: false,
      missingCodes: [],
      pricedCodes: [],
    };
  }

  const normalizedLookup = buildLookup(priceLookup);
  const prices = codes.map(code => {
    const price = readPrice(priceLookup, normalizedLookup, code);
    return { code, price };
  });
  const missingCodes = prices.filter(item => item.price == null).map(item => item.code);
  const pricedCodes = prices.filter(item => item.price != null).map(item => item.code);
  const isComplete = missingCodes.length === 0;
  const canUse = mode === 'partial' ? pricedCodes.length > 0 : isComplete;
  const sum = canUse
    ? prices.reduce((acc, item) => acc + (item.price == null ? 0 : item.price), 0)
    : 0;

  return {
    priceWithTax: canUse && sum > 0 ? sum : null,
    mode,
    isComposite: true,
    isComplete,
    missingCodes,
    pricedCodes,
  };
}
