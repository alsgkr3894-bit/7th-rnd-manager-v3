/**
 * lib/stats/note-stats.js — 메뉴개발노트 통계
 */

import { safeAll, currentYearMonth, shiftMonth, buildSparkline, isInMonth } from './_helpers';

export async function getNoteKpi() {
  const notes = await safeAll('menu_dev_notes');
  const total = notes.length;
  const reporting = notes.filter(n => n.status === '보고예정').length;

  const { year, month } = currentYearMonth();
  const sparkline = buildSparkline(year, month, (y, m) =>
    notes.filter(n => isInMonth(n.createdAt, y, m)).length
  );

  return { total, reporting, sparkline };
}

/** 상세 통계 — 노트 목록 통계 섹션용 */
export async function getNoteDetailStats() {
  const notes = await safeAll('menu_dev_notes');
  if (!notes.length) return null;

  const { year, month } = currentYearMonth();
  const thisMonthStart = new Date(year, month - 1, 1).getTime();
  const thisMonthEnd   = new Date(year, month, 1).getTime();

  const thisMonth = notes.filter(n => {
    const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    return t >= thisMonthStart && t < thisMonthEnd;
  }).length;

  const released    = notes.filter(n => n.status === '출시').length;
  const releaseRate = notes.length > 0 ? Math.round(released / notes.length * 100) : 0;

  // 상태별 분포
  const byStatus = {};
  for (const n of notes) byStatus[n.status] = (byStatus[n.status] || 0) + 1;

  // 카테고리별 분포
  const byCategory = {};
  for (const n of notes) byCategory[n.category] = (byCategory[n.category] || 0) + 1;

  // 최근 6개월 월별 작성 수
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const p    = shiftMonth(year, month, -i);
    const from = new Date(p.year, p.month - 1, 1).getTime();
    const to   = new Date(p.year, p.month, 1).getTime();
    monthly.push({
      label: `${p.month}월`,
      count: notes.filter(n => {
        const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
        return t >= from && t < to;
      }).length,
    });
  }

  return {
    total: notes.length, thisMonth, released, releaseRate,
    byStatus, byCategory, monthly,
  };
}

export async function getCostRateKpi() {
  return { rate: null, deltaPct: null, sparkline: [] };
}
