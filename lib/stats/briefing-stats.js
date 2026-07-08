/**
 * lib/stats/briefing-stats.js — 이번 달 브리핑 히어로 데이터
 *
 * 기존 KPI/경보 집계를 조합해 "한 문장 요약 + 통계 칩 + 스파크라인"을 만든다.
 * 판매 데이터에 일자 단위가 없어 주간은 산출 불가 — 월 단위 기준.
 */

import { getSalesKpi } from './sales-stats';
import { currentYearMonth } from './_helpers';
import { asArray, asFiniteNumber } from '@/lib/ui/prop-guards';

function normalizePeriod(value) {
  const fallback = currentYearMonth();
  const year = asFiniteNumber(value?.year);
  const month = asFiniteNumber(value?.month);
  if (year == null || month == null || month < 1 || month > 12) return fallback;
  return { year: Math.trunc(year), month: Math.trunc(month) };
}

function normalizeSalesKpi(value, anchor) {
  const period = normalizePeriod(value?.year != null && value?.month != null ? value : anchor);
  return {
    ...period,
    current: asFiniteNumber(value?.current, 0) ?? 0,
    deltaPct: asFiniteNumber(value?.deltaPct),
    sparkline: asArray(value?.sparkline).map(v => asFiniteNumber(v, 0) ?? 0),
  };
}

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
  const salesResult = await getSalesKpi(anchor).catch(() => null);
  const sales = normalizeSalesKpi(salesResult, anchor);

  const delta = sales?.deltaPct;
  const hasDelta = delta != null;
  const up = hasDelta && delta > 0;
  const sparkValues = sales.sparkline.filter(value => Number.isFinite(value));
  const average =
    sparkValues.length > 0
      ? Math.round(sparkValues.reduce((sum, value) => sum + value, 0) / sparkValues.length)
      : 0;

  // 한 문장 요약 (강조 span 정보 포함)
  const sentence = [];
  sentence.push({ text: `${sales.month}월 판매량은 ` });
  if (!hasDelta) {
    sentence.push({ text: '전월 대비 변화를 계산할 수 없어요' });
  } else if (delta === 0) {
    sentence.push({ text: '전월과 비슷한 수준' });
  } else {
    sentence.push({
      text: `전월 대비 ${up ? '+' : ''}${delta.toFixed(1)}%`,
      tone: up ? 'up' : 'down',
    });
    sentence.push({ text: up ? ' 늘었어요' : ' 줄었어요' });
  }
  sentence.push({ text: `. 최근 ${sparkValues.length || 0}개월 평균은 ` });
  sentence.push({ text: `${average.toLocaleString('ko-KR')}개`, tone: 'accent' });
  sentence.push({ text: '입니다.' });

  const deltaText = !hasDelta
    ? '전월 대비 —'
    : delta === 0
      ? '전월과 동일'
      : `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% 전월비`;

  return {
    rangeLabel: `${sales.year}년 ${sales.month}월`,
    sentence,
    chips: [
      {
        label: '이번 달 판매량',
        value: sales.current,
        unit: '개',
        deltaText,
        tone: !hasDelta || delta === 0 ? 'muted' : up ? 'up' : 'down',
      },
      {
        label: '전월 대비',
        value: hasDelta ? Math.abs(delta) : 0,
        unit: '%',
        deltaText,
        tone: !hasDelta || delta === 0 ? 'muted' : up ? 'up' : 'down',
      },
      {
        label: '최근 평균',
        value: average,
        unit: '개',
        deltaText: `${sparkValues.length || 0}개월 기준`,
        tone: 'muted',
      },
    ],
    spark: sales.sparkline,
  };
}
