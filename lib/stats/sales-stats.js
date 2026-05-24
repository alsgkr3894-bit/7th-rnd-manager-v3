/**
 * lib/stats/sales-stats.js — sales_rows 기반 통계
 *
 * 표준 필드 (v2 호환):
 *   { quantity, normalizedMenuName, mappedMenuName, category, year, month, status }
 */

import { safeAll, currentYearMonth, shiftMonth, monthLabel, pickMenuName } from './_helpers';

/* ============================================================
   내부 집계
============================================================ */

function sumQuantityIn(rows, year, month) {
  return rows
    .filter(r => Number(r.year) === year && Number(r.month) === month)
    .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
}

function sumByCategoryIn(rows, year, month) {
  const map = new Map();
  for (const r of rows) {
    if (Number(r.year) !== year || Number(r.month) !== month) continue;
    const cat = r.category || '미분류';
    map.set(cat, (map.get(cat) || 0) + (Number(r.quantity) || 0));
  }
  return Array.from(map, ([name, value]) => ({ name, value }));
}

function sumByMenuIn(rows, year, month) {
  const map = new Map();
  for (const r of rows) {
    if (Number(r.year) !== year || Number(r.month) !== month) continue;
    const name = pickMenuName(r);
    map.set(name, (map.get(name) || 0) + (Number(r.quantity) || 0));
  }
  return Array.from(map, ([name, quantity]) => ({ name, quantity }));
}

/* ============================================================
   공개 API
============================================================ */

/** 이번 달 누적 판매량 + 전월 대비 + 최근 7개월 sparkline */
export async function getSalesKpi() {
  const rows = await safeAll('sales_rows');
  const { year, month } = currentYearMonth();

  const current = sumQuantityIn(rows, year, month);
  const p = shiftMonth(year, month, -1);
  const prev = sumQuantityIn(rows, p.year, p.month);
  const deltaPct = prev > 0 ? ((current - prev) / prev) * 100 : null;

  const sparkline = [];
  for (let i = 6; i >= 0; i--) {
    const t = shiftMonth(year, month, -i);
    sparkline.push(sumQuantityIn(rows, t.year, t.month));
  }

  return { current, prev, deltaPct, sparkline };
}

/** 판매량 추이 (월별 6개월) — 이번 연도 vs 지난 연도 동월 */
export async function getSalesTrend(period = 'month') {
  const rows = await safeAll('sales_rows');
  const { year, month } = currentYearMonth();

  // 주별 모드는 sales 모듈 완성 후 정의 — 지금은 월별 동일 동작
  void period;

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

  return { labels, thisYear, lastYear };
}

const CATEGORY_COLORS = ['#3182F6', '#10B981', '#F59E0B', '#6B3FCB', '#EF4444', '#06B6D4', '#B0B8C1'];

/** 카테고리별 비중 (이번 달, 판매량 내림차순) */
export async function getCategoryShare() {
  const rows = await safeAll('sales_rows');
  const { year, month } = currentYearMonth();
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

/** TOP N 메뉴 (이번 달) */
export async function getTopMenus(limit = 5) {
  const rows = await safeAll('sales_rows');
  const { year, month } = currentYearMonth();
  return sumByMenuIn(rows, year, month)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)
    .map((m, i) => ({ rank: i + 1, name: m.name, quantity: m.quantity }));
}
