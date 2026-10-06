/**
 * lib/note/day-key.js — 노트·연구일지의 표시용 날짜 키 (순수)
 *
 * 연구일지 화면·캘린더 체크리스트·노트 상세가 함께 쓴다. 전엔 연구일지 화면 폴더
 * (app/note/journal/journalDates.js)에 있어 다른 화면이 화면 폴더를 가져다 썼다.
 */
import { formatLocalDateInput } from '@/lib/date/local-date';

// testDate는 이미 YYYY-MM-DD(정규형)이라 그대로 쓰고,
// createdAt 폴백만 로컬 달력일자로 변환한다(UTC slice 시 자정 부근 전날로 새던 문제 방지).
export function noteDayKey(n) {
  if (n?.testDate) return String(n.testDate).slice(0, 10);
  return n?.createdAt ? formatLocalDateInput(new Date(n.createdAt)) : '';
}
