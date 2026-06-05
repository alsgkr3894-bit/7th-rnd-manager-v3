/**
 * lib/stats/sales-stats.js — sales_rows 기반 통계
 *
 * 표준 필드 (v2 호환):
 *   { quantity, normalizedMenuName, mappedMenuName, category, year, month, status }
 */

import { safeAll, pickLatestYearMonth, shiftMonth, monthLabel, pickMenuName, buildSparkline } from './_helpers';
import { CATEGORY_COLORS } from '@/lib/sales/_stat-helpers';

/* ============================================================
   내부 집계
============================================================ */

/** 통계에 포함되는 행만: 정상 분류(classified) + 해당 월 */
function isStatRow(r, year, month) {
  return Number(r.year) === year
      && Number(r.month) === month
      && r.status === 'classified';
}

function sumQuantityIn(rows, year, month) {
  return rows
    .filter(r => isStatRow(r, year, month))
    .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
}

function sumByCategoryIn(rows, year, month) {
  const map = new Map();
  for (const r of rows) {
    if (!isStatRow(r, year, month)) continue;
    const cat = r.category || '미분류';
    map.set(cat, (map.get(cat) || 0) + (Number(r.quantity) || 0));
  }
  return Array.from(map, ([name, value]) => ({ name, value }));
}

/* ============================================================
   공개 API
============================================================ */

/** 이번 달 누적 판매량 + 전월 대비 + 최근 7개월 sparkline. anchor={year,month}로 기준 월 지정 가능. */
export async function getSalesKpi(anchor) {
  const rows = await safeAll('sales_rows');
  const { year, month } = anchor || pickLatestYearMonth(rows);

  const current = sumQuantityIn(rows, year, month);
  const p = shiftMonth(year, month, -1);
  const prev = sumQuantityIn(rows, p.year, p.month);
  const deltaPct = prev > 0 ? ((current - prev) / prev) * 100 : null;

  const sparkline = buildSparkline(year, month, (y, m) => sumQuantityIn(rows, y, m));

  return { current, prev, deltaPct, sparkline, year, month };
}

/**
 * 판매량 추이.
 *  - period='month' (기본): 최근 6개월, 이번 연도 vs 지난 연도 동월
 *  - period='year':         최근 5년 연간 합산
 */
export async function getSalesTrend(period = 'month', anchor) {
  const rows = await safeAll('sales_rows');

  if (period === 'year') {
    const { year } = anchor || pickLatestYearMonth(rows);
    const labels = [];
    const thisYear = [];
    const lastYear = []; // 년별 모드에서는 비교 시리즈 없음
    for (let i = 4; i >= 0; i--) {
      const y = year - i;
      labels.push(`${y}`);
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += sumQuantityIn(rows, y, m);
      thisYear.push(sum);
      lastYear.push(0);
    }
    return { labels, thisYear, lastYear, mode: 'year' };
  }

  // 월별 (기본)
  const { year, month } = anchor || pickLatestYearMonth(rows);
  const labels = [];
  const thisYear = [];
  const lastYear = [];
  for (let i = 5; i >= 0; i--) {
    const t = shiftMonth(year, month, -i);
    const tl = shiftMonth(year - 1, month, -i);
    labels.push(monthLabel(t.month));
    thisYear.push(sumQuantityIn(rows, t.year, t.month));
    lastYear.push(sumQuantityIn(rows, tl.year, tl.month));
  }
  return { labels, thisYear, lastYear, mode: 'month' };
}

/** 카테고리별 비중 (이번 달, 판매량 내림차순). anchor={year,month}로 기준 월 지정 가능. */
export async function getCategoryShare(anchor) {
  const rows = await safeAll('sales_rows');
  const { year, month } = anchor || pickLatestYearMonth(rows);
  const items = sumByCategoryIn(rows, year, month).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, x) => s + x.value, 0);

  return {
    total,
    items: items.map((it, i) => ({
      ...it,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    })),
  };
}

/**
 * TOP / 워스트 N 메뉴 (최신 업로드 월 기준).
 * @param {number} limit
 * @param {string|null} category — 카테고리 필터 (null 이면 전체)
 * @param {boolean} byGroup — true 면 중분류(groupName) 기준 합산 (L/R 사이즈 합쳐짐)
 * @param {'desc'|'asc'} order — desc(많이 팔린 순, 기본) / asc(적게 팔린 순)
 */
export async function getTopMenus(limit = 5, category = null, byGroup = false, order = 'desc', anchor) {
  const rows = await safeAll('sales_rows');
  const { year, month } = anchor || pickLatestYearMonth(rows);
  const scoped = category ? rows.filter(r => r.category === category) : rows;

  const map = new Map();
  for (const r of scoped) {
    if (!isStatRow(r, year, month)) continue;
    const key = byGroup
      ? (r.groupName || pickMenuName(r))
      : pickMenuName(r);
    map.set(key, (map.get(key) || 0) + (Number(r.quantity) || 0));
  }

  // 0건은 워스트에 포함하지 않음 (실제 판매 기록 있는 메뉴만)
  const items = Array.from(map, ([name, quantity]) => ({ name, quantity }))
    .filter(m => m.quantity > 0);

  return items
    .sort((a, b) => order === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity)
    .slice(0, limit)
    .map((m, i) => ({ rank: i + 1, name: m.name, quantity: m.quantity }));
}

/**
 * TOP/워스트 N + 메뉴별 최근 6개월 판매량 스파크라인.
 * 홈 베스트/워스트 카드에서 행별 미니 추이를 보여주기 위한 단일-패스 집계.
 *
 * @returns {Promise<Array<{ rank, name, quantity:number, spark:number[] }>>}
 */
export async function getTopMenusWithTrend(limit = 5, category = null, byGroup = false, order = 'desc', anchor) {
  const rows = await safeAll('sales_rows');
  const { year, month } = anchor || pickLatestYearMonth(rows);
  const scoped = category ? rows.filter(r => r.category === category) : rows;

  // 최근 6개월 키 (index 5 = 기준 월)
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(shiftMonth(year, month, -i));
  const idxOf = (y, m) => months.findIndex(p => p.year === y && p.month === m);

  const map = new Map();
  for (const r of scoped) {
    if (r.status !== 'classified') continue;
    const idx = idxOf(Number(r.year), Number(r.month));
    if (idx < 0) continue;
    const key = byGroup ? (r.groupName || pickMenuName(r)) : pickMenuName(r);
    let e = map.get(key);
    if (!e) { e = Array(6).fill(0); map.set(key, e); }
    e[idx] += Number(r.quantity) || 0;
  }

  const items = Array.from(map, ([name, spark]) => ({ name, quantity: spark[5], spark }))
    .filter(m => m.quantity > 0);

  return items
    .sort((a, b) => order === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity)
    .slice(0, limit)
    .map((m, i) => ({ rank: i + 1, name: m.name, quantity: m.quantity, spark: m.spark }));
}
