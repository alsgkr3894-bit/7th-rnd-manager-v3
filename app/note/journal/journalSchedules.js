/**
 * app/note/journal/journalSchedules.js — 선택 날짜 일정 해석·본문 변환 (순수)
 */
import { expandOccurrences } from '@/app/note/calendar/_recurrence';

export function occursOnDate(schedule, date) {
  return expandOccurrences(schedule, date, date).includes(date);
}

export function scheduleLine(schedule) {
  const head = [schedule.time, schedule.title].filter(Boolean).join(' ');
  const tail = [schedule.type, schedule.description].filter(Boolean).join(' · ');
  return tail ? `- ${head} (${tail})` : `- ${head}`;
}

export function buildScheduleText(schedules) {
  return schedules.map(scheduleLine).filter(Boolean).join('\n');
}
