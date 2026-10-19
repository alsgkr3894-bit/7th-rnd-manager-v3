/**
 * app/note/market/marketFilterUtils.js — 시장조사 목록 필터(국내/해외·국가·브랜드 업종) 순수 헬퍼
 */
import { MARKET_BRAND_TYPES, MARKET_RESEARCH_REGIONS } from '@/lib/note/market-research';

/** 국내/해외 필터 값 — 'all'은 전체, 'none'은 아직 구분하지 않은 이전 기록 */
export const REGION_FILTER_ALL = 'all';
export const REGION_FILTER_NONE = 'none';

export function matchesRegion(row, regionFilter) {
  if (!regionFilter || regionFilter === REGION_FILTER_ALL) return true;
  const region = String(row?.region || '').trim();
  if (regionFilter === REGION_FILTER_NONE) return !MARKET_RESEARCH_REGIONS.includes(region);
  return region === regionFilter;
}

/** 지역 필터 칩별 건수 — { all, 국내, 해외, none } */
export function countByRegion(rows) {
  const counts = { [REGION_FILTER_ALL]: 0, [REGION_FILTER_NONE]: 0 };
  for (const region of MARKET_RESEARCH_REGIONS) counts[region] = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    counts[REGION_FILTER_ALL] += 1;
    const region = String(row?.region || '').trim();
    if (MARKET_RESEARCH_REGIONS.includes(region)) counts[region] += 1;
    else counts[REGION_FILTER_NONE] += 1;
  }
  return counts;
}

export function matchesCountry(row, country) {
  if (!country) return true;
  return String(row?.country || '').trim() === country;
}

/** 브랜드 업종 필터 — 빈 값이면 전체 */
export function matchesBrandType(row, brandType) {
  if (!brandType) return true;
  return String(row?.brandType || '').trim() === brandType;
}

/** 업종 칩별 건수 — { '': 전체, 피자, 치킨, 기타 } */
export function countByBrandType(rows) {
  const counts = { '': 0 };
  for (const value of MARKET_BRAND_TYPES) counts[value] = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    counts[''] += 1;
    const value = String(row?.brandType || '').trim();
    if (MARKET_BRAND_TYPES.includes(value)) counts[value] += 1;
  }
  return counts;
}

/**
 * 고른 필터 값이 더는 목록에 없을 때(그 국가의 마지막 기록을 지우거나 고쳤을 때, 미분류가 모두
 * 분류됐을 때) 필터를 풀어 줘야 한다 — 안 그러면 목록이 빈 채로 "기록이 없다"고만 보인다.
 * 풀 필요가 없으면 null.
 */
export function staleFilterResets({ region, country, usedCountries = [], regionCounts = {} }) {
  const resets = {};
  if (country && !usedCountries.some(item => item.country === country)) resets.country = '';
  if (region === REGION_FILTER_NONE && (regionCounts[REGION_FILTER_NONE] || 0) === 0) {
    resets.region = REGION_FILTER_ALL;
  }
  return Object.keys(resets).length ? resets : null;
}
