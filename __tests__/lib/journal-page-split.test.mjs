import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 연구일지 페이지는 순수 헬퍼 25개 + 월별 목록 컴포넌트 + 페이지 조립이 한 파일
// (1062줄)에 몰려 있었다. 역할별로 나누고 page는 조립만 담당한다.
describe('연구일지 페이지 파일 분리', () => {
  test('page.jsx는 조립만 담당하고 650줄을 넘지 않는다', () => {
    const page = src('app/note/journal/page.jsx');
    expect(page.split('\n').length).toBeLessThanOrEqual(650);
    // 분리된 순수 헬퍼 구현이 page로 되돌아오지 않게 고정한다.
    expect(page).not.toContain('function withRelatedJournalPhotos');
    expect(page).not.toContain('function journalFormFromEntry');
    expect(page).not.toContain('function printRangeForMode');
    expect(page).not.toContain('function journalEntryMatches');
    expect(page).not.toContain('function JournalMonthList');
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
    ];
    for (const file of files) {
      expect(src(file).split('\n').length).toBeLessThanOrEqual(200);
    }
  });
});
