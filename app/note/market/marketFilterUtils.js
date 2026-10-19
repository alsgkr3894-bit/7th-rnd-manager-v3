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
 * 조사 날짜(YYYY-MM-DD)로 연·월 단위 조회. year가 비면 전체 기간, month는 year가 있을 때만 쓴다.
 * 날짜가 없는 기록은 기간을 고르면 빠진다.
 */
export function matchesPeriod(row, year, month) {
  if (!year) return true;
  const date = String(row?.date || '').trim();
  if (!/^\d{4}-\d{2}/.test(date)) return false;
  if (date.slice(0, 4) !== String(year)) return false;
  return !month || date.slice(5, 7) === String(month).padStart(2, '0');
}

/** 기록이 있는 연도 목록(최근 연도 먼저) + 건수 */
export function yearOptionsOf(rows) {
  const counts = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const year = String(row?.date || '')
      .trim()
      .slice(0, 4);
    if (/^\d{4}$/.test(year)) counts.set(year, (counts.get(year) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, count]) => ({ year, count }));
}

/** 고른 연·월 안의 월별 건수 — { '01': n, ... } (달 선택에 건수를 보여 주는 데 쓴다) */
export function monthCountsOf(rows, year) {
  const counts = {};
  if (!year) return counts;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!matchesPeriod(row, year, '')) continue;
    const month = String(row.date).slice(5, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  return counts;
}

/** PDF 머리에 적는 조회 조건 — 걸어 둔 필터·검색어를 한 줄로(아무것도 없으면 "전체"). */
export function describeMarketFilters({ year, month, region, brandType, country, query } = {}) {
  const regionText =
    region === REGION_FILTER_NONE ? '미분류' : region && region !== REGION_FILTER_ALL ? region : '';
  const periodText = year ? `${year}년${month ? ` ${Number(month)}월` : ''}` : '';
  const parts = [periodText, regionText, brandType, country, String(query || '').trim()].filter(
    Boolean
  );
  return parts.length ? parts.join(' · ') : '전체';
}

/**
 * 고른 필터 값이 더는 목록에 없을 때(그 국가의 마지막 기록을 지우거나 고쳤을 때, 미분류가 모두
 * 분류됐을 때) 필터를 풀어 줘야 한다 — 안 그러면 목록이 빈 채로 "기록이 없다"고만 보인다.
 * 풀 필요가 없으면 null.
 */
export function staleFilterResets({
  region,
  country,
  year = '',
  month = '',
  usedCountries = [],
  regionCounts = {},
  yearOptions = [],
}) {
  const resets = {};
  if (year && !yearOptions.some(item => item.year === year)) {
    resets.year = '';
    resets.month = '';
  } else if (!year && month) {
    resets.month = '';
  }
  if (country && !usedCountries.some(item => item.country === country)) resets.country = '';
  if (region === REGION_FILTER_NONE && (regionCounts[REGION_FILTER_NONE] || 0) === 0) {
    resets.region = REGION_FILTER_ALL;
  }
  return Object.keys(resets).length ? resets : null;
}
