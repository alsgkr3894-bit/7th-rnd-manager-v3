import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getAllSchedules = jest.fn();
const hasStore = jest.fn();
const getAll = jest.fn();

jest.unstable_mockModule('@/lib/note/schedules', () => ({
  getAllSchedules: (...args) => getAllSchedules(...args),
  SCHEDULE_COLORS: {
    '미팅': { bg: '#f0f', text: '#111', border: '#222' },
    '기타': { bg: 'var(--surface-2)', text: 'var(--text-2)', border: 'var(--border)' },
  },
}));

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
}));

const { getWeekSchedule } = await import('../../lib/stats/schedule-stats.js');
const { getTodayTodos } = await import('../../lib/stats/todo-stats.js');

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
  getAllSchedules.mockResolvedValue([]);
});

describe('schedule and todo stats guards', () => {
  test('이번 주 일정은 깨진 일정 행과 표시값을 안전하게 정규화한다', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    getAllSchedules.mockResolvedValue([
      null,
      'bad',
      { id: {}, date: todayStr, title: {}, time: 123, type: '미팅', description: {} },
      { id: 7, date: todayStr, title: '정상 일정', time: '10:30', type: '없는 타입', description: '설명' },
      { id: 9, date: 'bad-date', title: '무시' },
    ]);

    const result = await getWeekSchedule();

    expect(result.days.some(day => day.dateStr === todayStr && day.hasEvent)).toBe(true);
    expect(result.events).toEqual([
      expect.objectContaining({
        title: '일정',
        sub: '123',
        type: '미팅',
        color: { bg: '#f0f', text: '#111', border: '#222' },
      }),
      expect.objectContaining({
        id: '7',
        title: '정상 일정',
        sub: '10:30 · 설명',
        type: '없는 타입',
        color: { bg: 'var(--surface-2)', text: 'var(--text-2)', border: 'var(--border)' },
      }),
    ]);
  });

  test('오늘 할 일은 깨진 노트와 일정 값을 표시 가능한 값으로 유지한다', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    getAll.mockResolvedValue([
      null,
      { id: {}, status: '보고예정', title: {}, menuName: 123, category: '피자' },
      { id: 5, status: '완료', title: '무시' },
    ]);
    getAllSchedules.mockResolvedValue([
      null,
      { id: {}, date: todayStr, title: {}, time: {}, type: 7 },
      { id: 2, date: 'bad-date', title: '무시' },
    ]);

    const result = await getTodayTodos('bad');

    expect(result).toEqual([
      {
        id: 'note:0',
        title: '메뉴개발노트',
        sub: '123',
        tag: 'report',
        f: 'report',
        href: '/note',
      },
      {
        id: 'sch:1',
        title: '일정',
        sub: '오늘 · 7',
        tag: 'due',
        f: 'due',
        href: '/note/calendar',
      },
    ]);
  });
});
