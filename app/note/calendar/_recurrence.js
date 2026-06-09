/**
 * _recurrence.js — 반복 일정 발생일 계산 (순수 함수)
 *
 * expandOccurrences(schedule, rangeStart, rangeEnd)
 *   schedule  : { date, repeatType, repeatUntil }
 *   rangeStart: 'YYYY-MM-DD' — 검색 범위 시작 (포함)
 *   rangeEnd  : 'YYYY-MM-DD' — 검색 범위 끝 (포함)
 *   returns   : 'YYYY-MM-DD'[] — 발생 날짜 목록
 */

const MAX_ITER = 1000;

/** 'YYYY-MM-DD' → Date (UTC midnight 기준이 아닌 로컬 자정 으로 읽어야 요일이 맞음) */
function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → 'YYYY-MM-DD' */
function fmt(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * schedule 의 반복 규칙에 따라 [rangeStart, rangeEnd] 범위 내 발생일을 반환.
 * @param {{ date: string, repeatType?: string, repeatUntil?: string|null }} schedule
 * @param {string} rangeStart
 * @param {string} rangeEnd
 * @returns {string[]}
 */
export function expandOccurrences(schedule, rangeStart, rangeEnd) {
  const { date: baseStr, repeatType = 'none', repeatUntil = null } = schedule;
  if (!baseStr) return [];

  // 유효 범위의 끝: rangeEnd vs repeatUntil 중 더 이른 날짜
  const effectiveEnd = repeatUntil && repeatUntil < rangeEnd ? repeatUntil : rangeEnd;

  const results = [];

  if (repeatType === 'none') {
    // 단일 발생
    if (baseStr >= rangeStart && baseStr <= effectiveEnd) {
      results.push(baseStr);
    }
    return results;
  }

  // 반복 — baseStr 이전은 절대 포함하지 않음
  const cursor = parse(baseStr);
  const endDt = parse(effectiveEnd);
  const startDt = parse(rangeStart);
  // baseStr 이 rangeEnd 보다 뒤면 발생 없음
  if (cursor > endDt) return [];

  let iter = 0;

  if (repeatType === 'daily') {
    // cursor 를 rangeStart 이상으로 빠르게 이동 (base 보다 앞으로 가지 않도록)
    if (cursor < startDt) {
      const diffDays = Math.ceil((startDt - cursor) / 86400000);
      cursor.setDate(cursor.getDate() + diffDays);
    }
    while (cursor <= endDt && iter < MAX_ITER) {
      if (cursor >= startDt) results.push(fmt(cursor));
      cursor.setDate(cursor.getDate() + 1);
      iter++;
    }
  } else if (repeatType === 'weekly') {
    if (cursor < startDt) {
      const diffDays = Math.ceil((startDt - cursor) / 86400000);
      const weeks = Math.ceil(diffDays / 7);
      cursor.setDate(cursor.getDate() + weeks * 7);
    }
    while (cursor <= endDt && iter < MAX_ITER) {
      if (cursor >= startDt) results.push(fmt(cursor));
      cursor.setDate(cursor.getDate() + 7);
      iter++;
    }
  } else if (repeatType === 'monthly') {
    const dayOfMonth = cursor.getDate(); // 원본 일(day) 저장
    // 시작 연/월
    let year = cursor.getFullYear();
    let month = cursor.getMonth(); // 0-indexed

    while (iter < MAX_ITER) {
      // 이 달에 dayOfMonth 가 존재하는지 확인 (e.g. 2월 31일 → 없음)
      const maxDay = new Date(year, month + 1, 0).getDate();
      if (dayOfMonth <= maxDay) {
        const candidate = new Date(year, month, dayOfMonth);
        const candStr = fmt(candidate);
        if (candStr > effectiveEnd) break; // 범위 초과 → 종료
        if (candStr >= rangeStart && candidate >= parse(baseStr)) {
          results.push(candStr);
        }
      }
      // 다음 달로 이동
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
      // 조기 종료: 이미 effectiveEnd 를 지난 연/월
      if (year > parse(effectiveEnd).getFullYear() + 1) break;
      iter++;
    }
  }

  return results;
}
