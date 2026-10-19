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
