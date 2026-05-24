/**
 * lib/stats/note-stats.js — 메뉴개발노트 통계
 *
 * 노트 store 필드:
 *   { id, status, category, createdAt, title, ... }
 */

import { safeAll, currentYearMonth, shiftMonth } from './_helpers';

/** 진행 중 노트 KPI + 최근 7개월 누적 sparkline */
export async function getNoteKpi() {
  const notes = await safeAll('menu_dev_notes');
  const total = notes.length;
  const reporting = notes.filter(n => n.status === '보고예정').length;

  const { year, month } = currentYearMonth();
  const sparkline = [];
  for (let i = 6; i >= 0; i--) {
    const p = shiftMonth(year, month, -i);
    const beforeTs = new Date(p.year, p.month, 1).getTime();
    sparkline.push(notes.filter(n => {
      const created = n.createdAt ? new Date(n.createdAt).getTime() : 0;
      return created > 0 && created < beforeTs;
    }).length);
  }

  return { total, reporting, sparkline };
}

/** 원가율 KPI — 원가 모듈 미구현이므로 null 반환 (UI에서 '—' 표시) */
export async function getCostRateKpi() {
  return { rate: null, deltaPct: null, sparkline: [] };
}
