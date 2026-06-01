/**
 * lib/stats/schedule-stats.js — 이번 주 개발 일정 (note_schedules 기반)
 */

import { getAllSchedules, SCHEDULE_COLORS } from '@/lib/note/schedules';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 이번 주(일~토) 일정 스트립 + 일정 리스트.
 *
 * @returns {Promise<{
 *   rangeLabel: string,
 *   days: Array<{ dow, num, dateStr, today:boolean, hasEvent:boolean }>,
 *   events: Array<{ id, title, sub, dow, num, type, color:{bg,text,border} }>,
 * }>}
 */
export async function getWeekSchedule() {
  const schedules = await getAllSchedules().catch(() => []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay()); // 이번 주 일요일

  const todayStr = toDateStr(today);
  const byDate = new Map();
  for (const s of schedules) {
    if (!s.date) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }

  const days = [];
  const weekDateStrs = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const ds = toDateStr(d);
    weekDateStrs.push(ds);
    days.push({
      dow: DOW[i],
      num: d.getDate(),
      dateStr: ds,
      today: ds === todayStr,
      hasEvent: byDate.has(ds),
    });
  }

  const events = [];
  // days[i]의 dow/num은 로컬 Date 산술로 계산돼 타임존 무관하게 정확하다.
  // new Date('YYYY-MM-DD')는 UTC 자정으로 파싱돼 음수 오프셋 타임존에서 하루 밀리므로
  // 재파싱하지 않고 인덱스로 days[i]를 그대로 참조한다.
  weekDateStrs.forEach((ds, i) => {
    const list = byDate.get(ds);
    if (!list) return;
    for (const s of list) {
      events.push({
        id: s.id,
        title: s.title || '일정',
        sub: [s.time, s.description].filter(Boolean).join(' · '),
        dow: days[i].dow,
        num: days[i].num,
        type: s.type || '기타',
        color: SCHEDULE_COLORS[s.type] || SCHEDULE_COLORS['기타'],
      });
    }
  });

  const rangeLabel = `${weekDateStrs[0].slice(5).replace('-', '.')} – ${weekDateStrs[6].slice(5).replace('-', '.')}`;
  return { rangeLabel, days, events };
}
