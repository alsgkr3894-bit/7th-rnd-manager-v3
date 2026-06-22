import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildCalendarMonthEventDates,
  buildCalendarMonthPrintHtml,
  escapeCalendarPrintValue,
} from '../../app/note/calendar/calendar-print.js';

const pageSource = readFileSync(resolve('app/note/calendar/page.jsx'), 'utf8');
const actionsSource = readFileSync(resolve('app/note/calendar/CalendarPageActions.jsx'), 'utf8');
const toolbarSource = readFileSync(resolve('app/note/calendar/CalendarToolbar.jsx'), 'utf8');
const workspaceSource = readFileSync(resolve('app/note/calendar/CalendarWorkspace.jsx'), 'utf8');
const dialogsSource = readFileSync(resolve('app/note/calendar/CalendarPageDialogs.jsx'), 'utf8');
const printSource = readFileSync(resolve('app/note/calendar/calendar-print.js'), 'utf8');
const panelSource = readFileSync(resolve('app/note/calendar/_DayPanel.jsx'), 'utf8');
const dataHookSource = readFileSync(resolve('app/note/calendar/useCalendarData.js'), 'utf8');

describe('note calendar month print helpers', () => {
  test('month event dates are scoped to the current month and sorted', () => {
    const notesByDate = new Map([
      ['2026-06-20', [{ title: '노트' }]],
      ['2026-07-01', [{ title: '다음달' }]],
    ]);
    const schedulesByDate = new Map([
      ['2026-06-03', [{ title: '일정' }]],
      ['2026-05-31', [{ title: '지난달' }]],
    ]);

    expect(
      buildCalendarMonthEventDates({ viewYear: 2026, viewMonth: 6, notesByDate, schedulesByDate })
    ).toEqual(['2026-06-03', '2026-06-20']);
  });

  test('print html escapes user text and keeps schedule before note rows', () => {
    const notesByDate = new Map([
      [
        '2026-06-03',
        [{ menuName: '노트 <메뉴>', status: '완료', result: 'A & B', summary: 'unused' }],
      ],
    ]);
    const schedulesByDate = new Map([
      [
        '2026-06-03',
        [{ time: '10:00', title: '회의 <초안>', type: '보고', memo: 'memo & detail' }],
      ],
    ]);
    const html = buildCalendarMonthPrintHtml({
      viewYear: 2026,
      viewMonth: 6,
      notesByDate,
      schedulesByDate,
      title: '2026년 6월 달력',
    });

    expect(html).toContain('<title>2026년 6월 달력</title>');
    expect(html).toContain('회의 &lt;초안&gt;');
    expect(html).toContain('memo &amp; detail');
    expect(html).toContain('노트 &lt;메뉴&gt;');
    expect(html).toContain('A &amp; B');
    expect(html.indexOf('class="type sched"')).toBeLessThan(html.indexOf('class="type note"'));
    expect(html).toContain('window.print()');
  });

  test('empty month output keeps an explicit empty state', () => {
    const html = buildCalendarMonthPrintHtml({
      viewYear: 2026,
      viewMonth: 6,
      notesByDate: new Map(),
      schedulesByDate: new Map(),
      title: '빈 달력',
    });

    expect(html).toContain('이번 달 항목이 없습니다');
    expect(escapeCalendarPrintValue('<>&')).toBe('&lt;&gt;&amp;');
  });
});

describe('note calendar page structure', () => {
  test('page delegates print, header actions, toolbar, workspace, and dialogs', () => {
    expect(pageSource).toContain('useCalendarData({ canEdit })');
    expect(pageSource).toContain('<CalendarPageActions');
    expect(pageSource).toContain('<CalendarToolbar');
    expect(pageSource).toContain('<CalendarWorkspace');
    expect(pageSource).toContain('<CalendarPageDialogs');
    expect(pageSource).toContain(
      'printCalendarMonth({ viewYear, viewMonth, notesByDate, schedulesByDate })'
    );

    expect(pageSource).not.toContain('buildAutoPrintScript');
    expect(pageSource).not.toContain('openPrintWindow');
    expect(pageSource).not.toContain('gridTemplateColumns: selectedDay');
    expect(pageSource).not.toContain('CALENDAR_VIEW_MODES.map');
  });

  test('calendar work-log prune is gated behind edit permission', () => {
    expect(dataHookSource).toContain('export function useCalendarData({ canEdit = false } = {})');
    expect(dataHookSource).toContain(
      'if (canEdit) await pruneOldWorkLogs(WORK_LOG_RETENTION_DAYS);'
    );
    expect(dataHookSource).toContain('}, [canEdit]);');
  });

  test('split files own focused calendar page responsibilities', () => {
    expect(actionsSource).toContain('export function CalendarPageActions');
    expect(actionsSource).toContain('printCurrentPageWithDownloadDate');
    expect(actionsSource).toContain('disabled={!canExport}');

    expect(toolbarSource).toContain('export const CALENDAR_VIEW_MODES');
    expect(toolbarSource).toContain('onShiftMonth(-1)');
    expect(toolbarSource).toContain('onResetToToday');
    expect(toolbarSource).toContain('CALENDAR_VIEW_MODES.map');

    expect(workspaceSource).toContain('export function CalendarWorkspace');
    expect(workspaceSource).toContain('<CalendarGrid');
    expect(workspaceSource).toContain('<DayPanel');
    expect(workspaceSource).toContain('gridTemplateColumns: selectedDay');
    expect(workspaceSource).toContain('onOpenNote={onOpenNote}');
    expect(workspaceSource).toContain('onOpenSample={onOpenSample}');

    expect(dialogsSource).toContain('export function CalendarPageDialogs');
    expect(dialogsSource).toContain('<ScheduleModal');
    expect(dialogsSource).toContain('<ConfirmDialog');

    expect(printSource).toContain('export function buildCalendarMonthPrintHtml');
    expect(printSource).toContain('export function printCalendarMonth');
    expect(printSource).toContain('buildAutoPrintScript()');

    expect(panelSource).toContain('onOpenNote');
    expect(panelSource).toContain('onOpenSample');
  });
});
