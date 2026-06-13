/**
 * 로컬 타임존 기준 날짜 문자열 유틸리티.
 * new Date().toISOString()은 UTC 기준이므로 UTC+9(한국) 환경에서
 * 자정~오전 9시 사이에 하루가 밀리는 버그가 있다.
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 오늘 날짜(로컬 타임존 기준) → "YYYY-MM-DD" */
export function todayLocalDate() {
  return formatLocal(new Date());
}

/** days일 전 날짜(로컬 타임존 기준) → "YYYY-MM-DD" */
export function localDateBefore(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocal(d);
}
