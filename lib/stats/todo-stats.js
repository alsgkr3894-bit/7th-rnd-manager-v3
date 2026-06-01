/**
 * lib/stats/todo-stats.js — 오늘 할 일 (보고예정 노트 + 마감 임박 일정)
 *
 * 완료 상태는 노트/일정에 역기록하지 않고 컴포넌트가 localStorage로 오버레이한다.
 */

import { safeAll } from './_helpers';
import { getAllSchedules } from '@/lib/note/schedules';

/** YYYY-MM-DD (로컬) */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

  const todos = [];

  for (const n of notes) {
    if (n.status !== '보고예정') continue;
    todos.push({
      id: `note:${n.id}`,
      title: n.title || '메뉴개발노트',
      sub: n.menuName || n.category || '보고예정',
      tag: 'report',
      f: 'report',
      href: `/note/${n.id}`,
    });
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limit = new Date(today); limit.setDate(limit.getDate() + dueWithinDays);
  const todayStr = toDateStr(today);
  const limitStr = toDateStr(limit);

  for (const s of schedules) {
    if (!s.date) continue;
    if (s.date < todayStr || s.date > limitStr) continue;
    const dday = s.date === todayStr ? '오늘' : `${s.date.slice(5).replace('-', '/')}`;
    todos.push({
      id: `sch:${s.id}`,
      title: s.title || '일정',
      sub: [dday, s.time, s.type].filter(Boolean).join(' · '),
      tag: 'due',
      f: 'due',
      href: '/note/calendar',
    });
  }

  return todos;
}
