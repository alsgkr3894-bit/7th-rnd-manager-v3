/**
 * lib/stats/briefing-stats.js — 이번 달 브리핑 히어로 데이터
 *
 * 기존 KPI/경보 집계를 조합해 "한 문장 요약 + 통계 칩 + 스파크라인"을 만든다.
 * 판매 데이터에 일자 단위가 없어 주간은 산출 불가 — 월 단위 기준.
 */

import { getSalesKpi } from './sales-stats';
import { getNoteKpi } from './note-stats';
import { getCostAlertData } from './cost-stats';
import { safeAll, isInMonth } from './_helpers';

/**
 * @param {{year:number, month:number}} [anchor] 기준 월 (없으면 최신 업로드 월)
 * @returns {Promise<{
 *   rangeLabel: string,
 *   sentence: Array<{ text:string, tone?: 'up'|'down'|'accent' }>,
 *   chips: Array<{ label, value:number, unit:string, deltaText?:string, tone?:string }>,
 *   spark: number[],
 * }>}
 */
export async function getMonthlyBriefing(anchor) {
  const [sales, note, alert, notes] = await Promise.all([
    getSalesKpi(anchor),
    getNoteKpi(),
    getCostAlertData().catch(() => null),
    safeAll('menu_dev_notes'),
  ]);

  // 신규 노트 수 = 기준 월(anchor)에 작성된 노트 수.
  // (getNoteKpi의 스파크라인은 항상 현재 실제 월 기준이라 anchor 이동과 어긋난다)
  const newNotes  = notes.filter(n => isInMonth(n.createdAt, sales.year, sales.month)).length;
  const reporting = note?.reporting ?? 0;
  const alertCount = alert ? alert.items.filter(i => i.costRate > 40).length : 0;

  const delta = sales?.deltaPct;
  const hasDelta = delta != null;
  const up = hasDelta && delta > 0;

  // 한 문장 요약 (강조 span 정보 포함)
  const sentence = [];
  sentence.push({ text: `${sales.month}월 판매량은 ` });
  if (!hasDelta) {
    sentence.push({ text: '전월 대비 변화를 계산할 수 없어요' });
  } else if (delta === 0) {
    sentence.push({ text: '전월과 비슷한 수준' });
  } else {
    sentence.push({ text: `전월 대비 ${up ? '+' : ''}${delta.toFixed(1)}%`, tone: up ? 'up' : 'down' });
    sentence.push({ text: up ? ' 늘었어요' : ' 줄었어요' });
  }
  sentence.push({ text: '. 이번 달 신규 노트 ' });
  sentence.push({ text: `${newNotes}건`, tone: 'accent' });
  sentence.push({ text: '이 추가됐고, ' });
  if (alertCount > 0) {
    sentence.push({ text: `원가율 경보 ${alertCount}건`, tone: 'accent' });
    sentence.push({ text: '은 확인이 필요해요.' });
  } else {
    sentence.push({ text: '원가율 경보는 없어요.' });
  }

  const deltaText = !hasDelta ? '전월 대비 —'
    : delta === 0 ? '전월과 동일'
    : `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% 전월비`;

  return {
    rangeLabel: `${sales.year}년 ${sales.month}월`,
    sentence,
    chips: [
      { label: '이번 달 판매량', value: sales.current, unit: '개', deltaText, tone: !hasDelta || delta === 0 ? 'muted' : up ? 'up' : 'down' },
      { label: '신규 노트',      value: newNotes,  unit: '건', deltaText: `누적 ${note?.total ?? 0}건`, tone: 'muted' },
      { label: '보고예정',       value: reporting, unit: '건', deltaText: reporting > 0 ? '확인 대기' : '대기 없음', tone: 'muted' },
      { label: '원가율 경보',    value: alertCount, unit: '건', deltaText: '40% 초과 메뉴', tone: alertCount > 0 ? 'down' : 'muted' },
    ],
    spark: sales?.sparkline ?? [],
  };
}
