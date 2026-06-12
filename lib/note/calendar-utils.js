/**
 * lib/note/calendar-utils.js — 달력 그리드 계산 유틸
 * 샘플 달력 등 여러 곳에서 공유되는 순수 함수.
 */

/**
 * 주어진 월의 달력 그리드 셀 배열을 반환한다.
 * 각 셀: { date: Date, cur: boolean } — cur=false는 이전/다음 달 날짜.
 *
 * @param {Date} month - 표시할 월의 임의 날짜 (getFullYear/getMonth 사용)
 * @param {number} totalCells - 그리드 총 칸 수 (기본 42: 6주×7일)
 */
export function buildCalendarDays(month, totalCells = 42) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const startDow = new Date(year, mon, 1).getDay();
  const lastDay = new Date(year, mon + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < startDow; i++) {
    days.push({ date: new Date(year, mon, -startDow + i + 1), cur: false });
  }
  for (let d = 1; d <= lastDay; d++) {
    days.push({ date: new Date(year, mon, d), cur: true });
  }
  const rem = totalCells - days.length;
  for (let d = 1; d <= rem; d++) {
    days.push({ date: new Date(year, mon + 1, d), cur: false });
  }
  return days;
}
