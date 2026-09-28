import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 연구일지 페이지는 순수 헬퍼 25개 + 월별 목록 컴포넌트 + 페이지 조립이 한 파일
// (1062줄)에 몰려 있었다. 역할별로 나누고 page는 조립만 담당한다.
describe('연구일지 페이지 파일 분리', () => {
  test('page.jsx는 조립만 담당하고 200줄을 넘지 않는다', () => {
    const page = src('app/note/journal/page.jsx');
    expect(page.split('\n').length).toBeLessThanOrEqual(200);
    // 분리된 순수 헬퍼·훅 구현이 page로 되돌아오지 않게 고정한다.
    expect(page).not.toContain('function withRelatedJournalPhotos');
    expect(page).not.toContain('function journalFormFromEntry');
    expect(page).not.toContain('function printRangeForMode');
    expect(page).not.toContain('function journalEntryMatches');
    expect(page).not.toContain('function JournalMonthList');
    expect(page).not.toContain('function saveJournalEntry');
    expect(page).not.toContain('function openJournalPdf');
    expect(page).not.toContain('function applyQuickDate');
  });

  test('날짜·기간 계산은 journalDates.js가 갖는다', () => {
    const dates = src('app/note/journal/journalDates.js');
    expect(dates).toContain('export function noteDayKey');
    expect(dates).toContain('export function toDateLabel');
    expect(dates).toContain('export function printRangeForMode');
    expect(dates).toContain('export function printRangeLabel');
    expect(dates).toContain('export function isWithinRange');
    expect(dates).toContain('export const DAY_LABELS');
  });

  test('폼 변환·일정 텍스트·검색은 각자 파일로 나뉜다', () => {
    const form = src('app/note/journal/journalForm.js');
    expect(form).toContain('export const EMPTY_JOURNAL_FORM');
    expect(form).toContain('export function journalFormFromEntry');
    expect(form).toContain('export function buildJournalNoteFromForm');
    expect(form).toContain('export function mergeJournalPrintNotesForDate');

    const schedules = src('app/note/journal/journalSchedules.js');
    expect(schedules).toContain('export function occursOnDate');
    expect(schedules).toContain('export function buildScheduleText');

    const search = src('app/note/journal/journalSearch.js');
    expect(search).toContain('export function journalEntryMatches');
  });

  test('분리된 파일도 각자 200줄을 넘지 않는다', () => {
    const files = [
      'app/note/journal/journalDates.js',
      'app/note/journal/journalForm.js',
      'app/note/journal/journalPhotos.js',
      'app/note/journal/journalSchedules.js',
      'app/note/journal/journalSearch.js',
      'app/note/journal/_JournalMonthList.jsx',
      'app/note/journal/_JournalEntryEditor.jsx',
      'app/note/journal/useJournalData.js',
      'app/note/journal/useJournalNavigation.js',
      'app/note/journal/useJournalForm.js',
      'app/note/journal/useJournalPrint.js',
      'app/note/journal/_JournalHeaderActions.jsx',
      'app/note/journal/_JournalDayRecords.jsx',
    ];
    for (const file of files) {
      expect(src(file).split('\n').length).toBeLessThanOrEqual(200);
    }
  });
});

/** 2026-09-28 주임님: PDF 출력 기간에 연간 추가 + 연도 직접 선택. */
describe('연구일지 출력 기간 — 연간', () => {
  test('고른 연도의 1/1~12/31을 쓰고 라벨은 "연간 YYYY년"', async () => {
    const { printRangeForMode, printRangeLabel, yearBounds } =
      await import('../../app/note/journal/journalDates.js');
    // 'YYYY'와 'YYYY-MM' 둘 다 받는다
    expect(yearBounds('2024')).toEqual({ start: '2024-01-01', end: '2024-12-31' });
    expect(yearBounds('2026-09')).toEqual({ start: '2026-01-01', end: '2026-12-31' });

    const range = printRangeForMode('year', { date: '2026-09-28', month: '2026-09', year: '2024' });
    expect(range).toEqual({ start: '2024-01-01', end: '2024-12-31' });
    expect(printRangeLabel('year', range)).toBe('연간 2024년');
  });

  test('연도를 안 넘기면 보고 있던 달의 연도를 쓴다', async () => {
    const { printRangeForMode } = await import('../../app/note/journal/journalDates.js');
    expect(printRangeForMode('year', { date: '2026-09-28', month: '2026-09' })).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  test('연간을 고르면 연도 선택기가 뜬다', () => {
    const src = readFileSync(resolve('app/note/journal/_JournalHeaderActions.jsx'), 'utf8');
    expect(src).toContain('<option value="year">연간</option>');
    expect(src).toContain("{printMode === 'year' && (");
    expect(src).toContain('setPrintYear(event.target.value)');
  });

  test('연도 목록은 일지가 있는 해 + 올해를 내림차순으로 준다', () => {
    const src = readFileSync(resolve('app/note/journal/useJournalPrint.js'), 'utf8');
    expect(src).toContain('yearOptions');
    expect(src).toContain('years.add(key.slice(0, 4))');
  });

  // page → 툴바 props가 하나라도 빠지면 연도 선택기가 조용히 안 뜬다.
  test('page.jsx가 연도 props를 툴바에 넘긴다', () => {
    const page = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');
    for (const prop of [
      'printYear={print.printYear}',
      'setPrintYear={print.setPrintYear}',
      'yearOptions={print.yearOptions}',
    ]) {
      expect(page).toContain(prop);
    }
    const toolbar = readFileSync(resolve('app/note/journal/_JournalHeaderActions.jsx'), 'utf8');
    for (const prop of ['printYear,', 'setPrintYear,', 'yearOptions,']) {
      expect(toolbar).toContain(prop);
    }
  });
});
