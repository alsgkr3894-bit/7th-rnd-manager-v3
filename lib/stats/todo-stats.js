/**
 * lib/stats/todo-stats.js — 오늘 할 일 (보고예정 노트 + 마감 임박 일정)
 *
 * 완료 상태는 노트/일정에 역기록하지 않고 컴포넌트가 localStorage로 오버레이한다.
 */

import { safeAll } from './_helpers';
import { getAllSchedules } from '@/lib/note/schedules';
import { asDisplayText, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD (로컬) */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeScheduleDate(value) {
  const date = asDisplayText(value);
  return DATE_RE.test(date) ? date : '';
}

/**
 * 오늘 할 일 목록.
 * - 보고예정 노트 → tag 'report'
 * - 오늘~D+2 이내 마감 임박 일정 → tag 'due'
 *
 * @param {number} [dueWithinDays=2]
 * @returns {Promise<Array<{ id, title, sub, tag:'report'|'due', f:'report'|'due', href }>>}
 */
export async function getTodayTodos(dueWithinDays = 2) {
  const [notes, schedules] = await Promise.all([
    safeAll('menu_dev_notes'),
    getAllSchedules().catch(() => []),
  ]);
  const safeDueWithinDays = clampInteger(dueWithinDays, { min: 0, max: 365, fallback: 2 });
  const scheduleRows = asObjectArray(schedules);

  const todos = [];

  for (const n of notes) {
    if (n.status !== '보고예정') continue;
    const noteId = asDisplayText(n.id);
    todos.push({
      id: `note:${noteId || todos.length}`,
      title: asDisplayText(n.title, '메뉴개발노트') || '메뉴개발노트',
      sub: asDisplayText(n.menuName || n.category, '보고예정') || '보고예정',
      tag: 'report',
      f: 'report',
      href: noteId ? `/note/${noteId}` : '/note',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + safeDueWithinDays);
  const todayStr = toDateStr(today);
  const limitStr = toDateStr(limit);

  for (const s of scheduleRows) {
    const date = safeScheduleDate(s.date);
    if (!date) continue;
    if (date < todayStr || date > limitStr) continue;
    const dday = date === todayStr ? '오늘' : `${date.slice(5).replace('-', '/')}`;
    const scheduleId = asDisplayText(s.id);
    todos.push({
      id: `sch:${scheduleId || todos.length}`,
      title: asDisplayText(s.title, '일정') || '일정',
      sub: [dday, asDisplayText(s.time), asDisplayText(s.type)].filter(Boolean).join(' · '),
      tag: 'due',
      f: 'due',
      href: '/note/calendar',
    });
  }

  return todos;
}
