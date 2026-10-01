import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { editReturnQuery, resolveEditReturn } from '../../lib/note/edit-return.js';
import { adjacentJournalDate } from '../../app/note/journal/journalDates.js';
import {
  buildCalendarMonthEventDates,
  buildCalendarMonthPrintHtml,
  calendarNoteContent,
} from '../../app/note/calendar/calendar-print.js';

// 2026-09-30 전체 점검(노트·달력·일지 영역 버그 헌트)에서 나온 것들.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('수정 후 돌아올 때 보던 날짜·월 유지', () => {
  test('연구일지는 date를, 달력은 month+day를 그대로 되돌려 보낸다', () => {
    expect(resolveEditReturn('?from=journal&date=2026-08-12', '/note')).toBe(
      '/note/journal?date=2026-08-12'
    );
    expect(resolveEditReturn('?from=calendar&month=2026-08&day=2026-08-12', '/note')).toBe(
      '/note/calendar?month=2026-08&day=2026-08-12'
    );
  });

  test('형식이 틀린 값은 버린다(주소에 아무 문자열이나 실리지 않게)', () => {
    expect(resolveEditReturn('?from=journal&date=../../x', '/note')).toBe('/note/journal');
    expect(resolveEditReturn('?from=calendar&month=2026-8', '/note')).toBe('/note/calendar');
  });

  test('값이 없으면 예전과 같다', () => {
    expect(resolveEditReturn('?from=journal', '/note')).toBe('/note/journal');
    expect(resolveEditReturn('', '/note')).toBe('/note');
    expect(resolveEditReturn('?from=board&date=2026-08-12', '/note')).toBe('/note/board');
  });

  test('editReturnQuery도 보기 상태를 붙인다', () => {
    expect(editReturnQuery('journal', undefined, { date: '2026-08-12' })).toBe(
      '?from=journal&date=2026-08-12'
    );
  });

  test('일지·달력이 돌아왔을 때 그 값으로 시작한다', () => {
    expect(read('app/note/journal/useJournalNavigation.js')).toContain(".get('date')");
    expect(read('app/note/calendar/useCalendarNavigation.js')).toContain(".get('month')");
    expect(read('app/note/calendar/useCalendarNavigation.js')).toContain(".get('day')");
    expect(read('app/note/market/page.jsx')).toContain(
      "resolveEditReturn(window.location.search, '')"
    );
  });
});

describe('달력에서 날짜를 눌러 노트 추가', () => {
  test('작성 화면이 testDate 쿼리를 테스트일로 쓴다', () => {
    const src = read('app/note/write/useNoteWriteController.js');
    expect(src).toContain("params.get('testDate')");
    expect(src).toContain('setForm(prev => ({ ...prev, testDate }))');
  });
});

describe('일지 이전/다음 이동', () => {
  const dates = ['2026-10-20', '2026-09-30', '2026-09-10']; // 내림차순(미래 일정 포함)

  test('현재 날짜에 기록이 없어도 가장 가까운 이전·다음 기록일로 간다', () => {
    expect(adjacentJournalDate(dates, '2026-09-20', 'prev')).toBe('2026-09-10');
    expect(adjacentJournalDate(dates, '2026-09-20', 'next')).toBe('2026-09-30');
  });

  test('기록일에 있을 때는 바로 옆 기록일', () => {
    expect(adjacentJournalDate(dates, '2026-09-30', 'prev')).toBe('2026-09-10');
    expect(adjacentJournalDate(dates, '2026-09-30', 'next')).toBe('2026-10-20');
  });

  test('끝에서는 null', () => {
    expect(adjacentJournalDate(dates, '2026-09-10', 'prev')).toBeNull();
    expect(adjacentJournalDate(dates, '2026-10-20', 'next')).toBeNull();
    expect(adjacentJournalDate([], '2026-09-10', 'next')).toBeNull();
  });
});

describe('달력 월 PDF', () => {
  const day = '2026-09-15';
  const maps = {
    notesByDate: new Map([
      [day, [{ title: '노트1', status: '테스트', testContent: '본문 내용입니다' }]],
    ]),
    schedulesByDate: new Map(),
    samplesByDate: new Map([[day, [{ sampleNames: ['치즈A'], company: '업체', result: '좋음' }]]]),
    workLogsByDate: new Map([[day, [{ type: 'NOTE', title: '작업', summary: '요약' }]]]),
  };

  test('노트 내용 칸이 비지 않는다(testContent를 읽는다)', () => {
    expect(calendarNoteContent({ testContent: '  여러   줄\n내용 ' })).toBe('여러 줄 내용');
    expect(calendarNoteContent({ nextAction: '다음에 할 일' })).toBe('다음에 할 일');
    const html = buildCalendarMonthPrintHtml({ viewYear: 2026, viewMonth: 9, ...maps });
    expect(html).toContain('본문 내용입니다');
  });

  test('샘플·작업일지도 출력된다', () => {
    const html = buildCalendarMonthPrintHtml({ viewYear: 2026, viewMonth: 9, ...maps });
    expect(html).toContain('치즈A');
    expect(html).toContain('type sample');
    expect(html).toContain('type log');
    expect(html).not.toContain('이번 달 항목이 없습니다');
  });

  test('샘플만 있는 달도 비어 있다고 나오지 않는다', () => {
    const html = buildCalendarMonthPrintHtml({
      viewYear: 2026,
      viewMonth: 9,
      notesByDate: new Map(),
      schedulesByDate: new Map(),
      samplesByDate: maps.samplesByDate,
    });
    expect(html).toContain('치즈A');
  });

  test('보기 모드를 따른다 — 샘플 모드에서는 노트·작업일지가 빠진다', () => {
    const html = buildCalendarMonthPrintHtml({
      viewYear: 2026,
      viewMonth: 9,
      ...maps,
      viewMode: 'samples',
    });
    expect(html).toContain('치즈A');
    expect(html).not.toContain('노트1');
    expect(html).not.toContain('type log');
    expect(
      buildCalendarMonthEventDates({ viewYear: 2026, viewMonth: 9, ...maps, viewMode: 'schedules' })
    ).toEqual([]);
  });

  test('이전 호출 방식(노트·일정만)도 그대로 동작한다', () => {
    const dates = buildCalendarMonthEventDates({
      viewYear: 2026,
      viewMonth: 9,
      notesByDate: maps.notesByDate,
      schedulesByDate: new Map(),
    });
    expect(dates).toEqual([day]);
  });
});

describe('체크리스트 연속 체크 · 체인 순환 · 날짜 · 칸반', () => {
  test('체크리스트 저장은 한 번에 하나씩, 저장소에서 최신 노트를 다시 읽는다', () => {
    const src = read('app/note/calendar/useTodayChecklist.js');
    expect(src).toContain('syncQueueRef');
    expect(src).toContain('(await getAllNotes()).filter');
    expect(src).not.toMatch(/Array\.isArray\(notes\)/);
    expect(read('app/note/calendar/page.jsx')).toContain(
      'useTodayChecklist({ today, load, canEdit })'
    );
  });

  test('getNotesInChain은 순환 parentId에서도 끝난다', () => {
    const src = read('lib/note/store.js');
    expect(src).toContain('visitedUp');
    expect(src).toContain('visitedDown');
  });

  test('createdAt 앞 10자리(UTC)가 아니라 로컬 일자 키를 쓴다', () => {
    expect(read('app/note/calendar/useTodayChecklist.js')).toContain(
      'const noteDateKey = noteDayKey'
    );
    expect(read('app/note/[id]/detail/ChainTimeline.jsx')).toContain('{noteDayKey(note)}');
    expect(read('app/note/[id]/detail/ChainTimeline.jsx')).not.toContain('createdAt.slice(0, 10)');
  });

  test('칸반은 같은 제목으로 묶인 모든 노트의 상태를 저장한다', () => {
    const src = read('hooks/useKanbanBoard.js');
    expect(src).toContain('for (const id of groupIds) await updateNoteChainStatus(id, newStatus)');
  });
});
