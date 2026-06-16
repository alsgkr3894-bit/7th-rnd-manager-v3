import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildCalendarCellModel,
  buildVisibleCalendarItems,
  shouldShowCalendarKind,
} from '../../app/note/calendar/calendar-grid/calendarGridUtils.js';

const gridSource = readFileSync(resolve('app/note/calendar/CalendarGrid.jsx'), 'utf8');
const monthGridSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/CalendarMonthGrid.jsx'),
  'utf8'
);
const dayCellSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/CalendarDayCell.jsx'),
  'utf8'
);
const dayHeaderSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/CalendarDayHeader.jsx'),
  'utf8'
);
const itemSource = readFileSync(resolve('app/note/calendar/calendar-grid/CalendarItem.jsx'), 'utf8');
const weekHeaderSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/CalendarWeekHeader.jsx'),
  'utf8'
);
const workLogDotsSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/WorkLogDots.jsx'),
  'utf8'
);
const emptyCellSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/EmptyCalendarCell.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('app/note/calendar/calendar-grid/calendarGridUtils.js'),
  'utf8'
);

describe('note calendar grid helpers', () => {
  test('view mode predicate keeps all and matching kinds visible', () => {
    expect(shouldShowCalendarKind('all', 'notes')).toBe(true);
    expect(shouldShowCalendarKind('notes', 'notes')).toBe(true);
    expect(shouldShowCalendarKind('samples', 'schedules')).toBe(false);
  });

  test('visible item helper preserves schedule, note, sample ordering and overflow', () => {
    const model = buildVisibleCalendarItems({
      viewMode: 'all',
      schedules: [{ id: 's1' }, { id: 's2' }],
      notes: [{ id: 'n1' }],
      samples: [{ id: 'p1' }],
    });

    expect(model.total).toBe(4);
    expect(model.overflow).toBe(1);
    expect(model.shown.map(item => `${item._kind}:${item.id}`)).toEqual([
      'schedule:s1',
      'schedule:s2',
      'note:n1',
    ]);
  });

  test('cell model attaches logs, samples, selected state, today state, and past state', () => {
    const cell = {
      key: '2026-06-16',
      dayNum: 16,
      dow: 2,
      notes: [{ id: 'n1' }],
      schedules: [{ id: 's1' }],
    };
    const logs = [{ type: 'NOTE' }];
    const samples = [{ id: 'p1' }];
    const model = buildCalendarCellModel({
      cell,
      workLogsByDate: new Map([[cell.key, logs]]),
      samplesByDate: new Map([[cell.key, samples]]),
      viewMode: 'samples',
      selectedDay: cell.key,
      today: cell.key,
      isPast: () => false,
      isToday: () => true,
    });

    expect(model).toMatchObject({
      key: cell.key,
      cellLogs: logs,
      cellSamples: samples,
      isSelected: true,
      hasToday: true,
      past: false,
      total: 1,
      overflow: 0,
    });
    expect(model.shown).toEqual([{ ...samples[0], _kind: 'sample' }]);
    expect(buildCalendarCellModel({ cell: null })).toBeNull();
  });
});

describe('note calendar grid structure', () => {
  test('CalendarGrid delegates header and month grid rendering details', () => {
    expect(gridSource).toContain('export function CalendarGrid');
    expect(gridSource).toContain('<CalendarWeekHeader');
    expect(gridSource).toContain('<CalendarMonthGrid');
    expect(gridSource).not.toContain('sampleNamesText');
    expect(gridSource).not.toContain('SCHEDULE_COLORS');
    expect(gridSource).not.toContain('STATUS_COLORS');
    expect(gridSource).not.toContain('WORK_LOG_TYPES');
    expect(gridSource).not.toContain('cells.map');
    expect(gridSource).not.toContain('cal-add-btn');
    expect(gridSource).not.toContain('개 더보기');
  });

  test('split calendar grid files own their focused rendering responsibilities', () => {
    expect(weekHeaderSource).toContain('export function CalendarWeekHeader');
    expect(weekHeaderSource).toContain('WEEKDAYS.map');
    expect(monthGridSource).toContain('export function CalendarMonthGrid');
    expect(monthGridSource).toContain('buildCalendarCellModel');
    expect(monthGridSource).toContain('<EmptyCalendarCell');
    expect(monthGridSource).toContain('<CalendarDayCell');
    expect(emptyCellSource).toContain('export function EmptyCalendarCell');

    expect(dayCellSource).toContain('export function CalendarDayCell');
    expect(dayCellSource).toContain('<CalendarDayHeader');
    expect(dayCellSource).toContain('<CalendarItem');
    expect(dayCellSource).toContain('<WorkLogDots');
    expect(dayCellSource).toContain('model.isSelected ? onClosePanel() : onSelectDay(model.key)');
    expect(dayCellSource).toContain('+{model.overflow}개 더보기');

    expect(dayHeaderSource).toContain('export function CalendarDayHeader');
    expect(dayHeaderSource).toContain('dayNumColor');
    expect(dayHeaderSource).toContain('cal-add-btn');
    expect(dayHeaderSource).toContain('onAddSchedule(model.key)');

    expect(itemSource).toContain('export function CalendarItem');
    expect(itemSource).toContain('function ScheduleCalendarItem');
    expect(itemSource).toContain('function SampleCalendarItem');
    expect(itemSource).toContain('function NoteCalendarItem');
    expect(itemSource).toContain('sampleNamesText');
    expect(itemSource).toContain('SCHEDULE_COLORS');
    expect(itemSource).toContain('STATUS_COLORS');
    expect(itemSource).toContain('STATUS_BORDER');

    expect(workLogDotsSource).toContain('export function WorkLogDots');
    expect(workLogDotsSource).toContain('WORK_LOG_TYPES');
    expect(workLogDotsSource).toContain('new Set(logs.map');
    expect(utilsSource).toContain('export function buildVisibleCalendarItems');
    expect(utilsSource).toContain('export function buildCalendarCellModel');
  });
});
