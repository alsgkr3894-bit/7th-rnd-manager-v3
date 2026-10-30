/**
 * lib/report/price-period.js — 제때 가격 보고서의 비교 파일 선택 (순수)
 *
 * 항상 "최신 파일"을 기준으로 삼고, 기간 옵션이 비교 대상(기준 파일)을 정한다.
 *  - week : 최신 파일 날짜보다 7일 이상 앞선 가장 최근 파일 (없으면 바로 앞 파일)
 *  - month: 최신 파일이 속한 달 직전의 마지막 파일 = 월초 가격 (없으면 그 달의 가장 이른 파일)
 *  - custom: 기간 끝 이전의 최신 파일 vs 시작일 이전의 가장 최근 파일
 * 2026-10-30: 이번 주·이번 달이 둘 다 "가장 최근 두 파일"로 같게 동작하던 것을 구분했다.
 */
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateOf(file) {
  return asDisplayText(file?.updateDate).slice(0, 10);
}

/** "YYYY-MM-DD"에서 days일 뒤(음수면 앞) 날짜 — 타임존과 무관하게 달력 계산만 한다. */
export function shiftDateString(date, days) {
  if (!DATE_RE.test(date)) return '';
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function sortNewestFirst(files) {
  return [...asObjectArray(files)].sort((a, b) => {
    const da = dateOf(a);
    const db = dateOf(b);
    if (da !== db) return da > db ? -1 : 1;
    return Number(b?.id ?? 0) - Number(a?.id ?? 0);
  });
}

/**
 * @param {object[]} files - price_files (id, updateDate)
 * @param {{ mode?: 'week'|'month'|'custom', from?: string, to?: string }} opts
 * @returns {{ latest: object, base: object }}
 */
export function pickPriceReportFiles(files, { mode = 'week', from, to } = {}) {
  const sorted = sortNewestFirst(files);
  if (sorted.length < 2) {
    throw new Error('비교할 가격 파일이 부족해요. 제때 가격 파일을 2개 이상 업로드해 주세요.');
  }

  if (mode === 'custom') {
    const safeTo = DATE_RE.test(to) ? to : dateOf(sorted[0]);
    const safeFrom = DATE_RE.test(from) ? from : shiftDateString(safeTo, -7);
    const latest = sorted.find(f => dateOf(f) <= safeTo);
    const base = sorted.find(f => dateOf(f) <= safeFrom && f.id !== latest?.id) || sorted[1];
    if (!latest || !base || latest.id === base.id) {
      throw new Error('선택한 기간에 비교할 가격 파일이 없어요. 기간을 조정해 주세요.');
    }
    return { latest, base };
  }

  const latest = sorted[0];
  const latestDate = dateOf(latest);
  const others = sorted.slice(1);
  let base = null;

  if (mode === 'month') {
    const monthStart = `${latestDate.slice(0, 7)}-01`;
    base = others.find(f => dateOf(f) < monthStart);
    if (!base) {
      const inMonth = others.filter(f => dateOf(f) >= monthStart);
      base = inMonth[inMonth.length - 1] || null;
    }
  } else {
    const limit = shiftDateString(latestDate, -7);
    base = others.find(f => dateOf(f) <= limit) || null;
  }

  return { latest, base: base || others[0] };
}
