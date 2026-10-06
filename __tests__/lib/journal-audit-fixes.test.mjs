import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  isJournalFormChanged,
  journalFormFromEntry,
  mergeJournalPrintNotesForDate,
} from '../../app/note/journal/journalForm.js';
import { calendarNoteContent } from '../../app/note/calendar/calendar-print.js';
import { buildJournalPrintHtml } from '../../lib/note/journal-print.js';

// 2026-10-06 연구일지 전체 점검에서 나온 것들.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('노트 수정 화면에서 연구일지가 메뉴개발 노트로 바뀌던 문제', () => {
  test('연구일지를 노트 수정 화면으로 열면 연구일지 화면 그 날짜로 보낸다', () => {
    const src = read('app/note/[id]/page.jsx');
    expect(src).toContain('if (isJournalNote(note)) {');
    expect(src).toContain('`/note/journal?date=${day}`');
  });

  test('저장 정규화가 연구일지 유형을 메뉴개발로 바꾸지 않는다', () => {
    const src = read('app/note/_NoteFormBody.jsx');
    expect(src).toContain('noteType === JOURNAL_NOTE_TYPE');
  });

  test('연구일지 화면의 일지 카드 수정 버튼은 위쪽 보고서 칸으로 간다', () => {
    const records = read('app/note/journal/_JournalDayRecords.jsx');
    expect(records).toContain('if (note.noteType === JOURNAL_NOTE_TYPE) {');
    expect(records).toContain('onEditJournal?.();');
  });
});

describe('저장하면 일지 사진이 지워지던 문제', () => {
  test('작성 칸은 화면용 사본(사진 걸러냄)이 아니라 저장된 원본에서 만든다', () => {
    const src = read('app/note/journal/useJournalData.js');
    expect(src).toContain('rawDayNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE)');
    expect(src).not.toContain('dayNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE)');
  });
});

describe('저장 안 한 보고서가 날짜 이동으로 사라지던 문제', () => {
  test('목록·이전/다음·날짜 조회·기록 수정 이동 전에 확인하고, 창 닫기도 막는다', () => {
    const guard = read('app/note/journal/useJournalLeaveGuard.js');
    expect(guard).toContain('useBeforeUnload(dirty, JOURNAL_LEAVE_MESSAGE)');
    expect(guard).toContain('window.confirm(JOURNAL_LEAVE_MESSAGE)');
    const page = read('app/note/journal/page.jsx');
    expect(page).toContain('useJournalLeaveGuard(canEdit && form.journalDirty');
    expect(guard).toContain("goPrev: guard(() => nav.goToAdjacentDate(datesWithNotes, 'prev'))");
    expect(guard).toContain('guard(nav.setDate)(day)');
    expect(guard).toContain('guardedRouter: { push: guard(url => router.push(url)) }');
    for (const prop of [
      'goPrev={leave.goPrev}',
      'goNext={leave.goNext}',
      'applyDate={leave.applyDate}',
      'applyQuickDate={leave.applyQuickDate}',
      'onSelectDate={leave.selectDate}',
      'router={leave.guardedRouter}',
    ]) {
      expect(page).toContain(prop);
    }
  });

  test('다시 불러올 때는 스켈레톤으로 바꾸지 않는다(펼친 줄·스크롤 유지)', () => {
    const page = read('app/note/journal/page.jsx');
    expect(page).toContain('const showSkeleton = loading && !loadedOnceRef.current');
  });
});

describe('같은 날 일지가 둘이면 PDF에 고친 내용이 두 번 나오던 문제', () => {
  test('지금 고치는 일지(id 같은 것) 한 건만 바꾼다', () => {
    const a = { id: 1, noteType: '연구일지', testDate: '2026-10-01', testContent: 'A' };
    const b = { id: 2, noteType: '연구일지', testDate: '2026-10-01', testContent: 'B' };
    const merged = mergeJournalPrintNotesForDate(
      [a, b],
      { id: 2, testContent: 'B 수정' },
      '2026-10-01'
    );
    expect(merged.map(note => note.testContent)).toEqual(['A', 'B 수정']);
  });

  test('새 일지(id 없음)는 그날 첫 일지 자리만, 일지가 없으면 날짜순으로 끼운다', () => {
    const a = { id: 1, noteType: '연구일지', testDate: '2026-10-01', testContent: 'A' };
    const b = { id: 2, noteType: '연구일지', testDate: '2026-10-01', testContent: 'B' };
    expect(
      mergeJournalPrintNotesForDate([a, b], { testContent: '새' }, '2026-10-01').map(
        n => n.testContent
      )
    ).toEqual(['새', 'B']);
    const other = { id: 3, noteType: '메뉴개발', testDate: '2026-10-02', testContent: 'X' };
    const added = mergeJournalPrintNotesForDate(
      [other],
      { noteType: '연구일지', testDate: '2026-10-01', testContent: '새' },
      '2026-10-01'
    );
    expect(added.map(n => n.testContent)).toEqual(['새', 'X']);
  });
});

describe('입력 중 변경 판정은 사진을 통째로 문자열화하지 않는다', () => {
  const photos = [
    { data: 'data:a', name: 'a' },
    { data: 'data:b', name: 'b' },
  ];
  const base = journalFormFromEntry({ testContent: '본문', photos });

  test('같은 내용이면 변경 없음, 본문·사진 개수·순서(대표사진)·설명이 바뀌면 변경', () => {
    expect(isJournalFormChanged({ ...base }, base)).toBe(false);
    expect(isJournalFormChanged({ ...base, photos: [...photos] }, base)).toBe(false);
    expect(isJournalFormChanged({ ...base, report: '본문!' }, base)).toBe(true);
    expect(isJournalFormChanged({ ...base, photos: [photos[0]] }, base)).toBe(true);
    expect(isJournalFormChanged({ ...base, photos: [photos[1], photos[0]] }, base)).toBe(true);
    expect(
      isJournalFormChanged(
        { ...base, photos: [{ ...photos[0], caption: '설명' }, photos[1]] },
        base
      )
    ).toBe(true);
    expect(read('app/note/journal/useJournalForm.js')).not.toContain('JSON.stringify(journalForm)');
  });

  test('PDF 사진 중복 제거는 PDF를 열 때만 한다', () => {
    const src = read('app/note/journal/useJournalPrint.js');
    expect(src).toContain('withoutJournalSourceDuplicatePhotos(printPeriodNotes)');
  });
});

describe('캘린더·PDF 파생 화면', () => {
  test('캘린더 PDF·일자 미리보기는 연구일지 옛 칸(다음 일정만 있는 일지)도 보여준다', () => {
    const journal = { noteType: '연구일지', testContent: '', nextAction: '스테이크 테스트' };
    expect(calendarNoteContent(journal)).toContain('스테이크 테스트');
    expect(calendarNoteContent({ noteType: '메뉴개발', testContent: '테스트' })).toBe('테스트');
    expect(read('app/note/calendar/_DayNoteSection.jsx')).toContain(
      'isJournalNote(note) ? journalReportText(note) : note.testContent'
    );
  });

  test('긴 보고서 칸은 쪽 사이에서 나뉠 수 있다(앞 장 큰 빈칸 방지), 짧은 칸은 그대로', () => {
    const long = buildJournalPrintHtml('2026-10-01', [
      { noteType: '연구일지', title: '일지', testContent: '가'.repeat(400) },
    ]);
    expect(long).toContain('<section class="report-section long">');
    const short = buildJournalPrintHtml('2026-10-01', [
      { noteType: '연구일지', title: '일지', testContent: '짧은 보고' },
    ]);
    expect(short).toContain('<section class="report-section">');
    expect(short).toContain('.report-section.long { break-inside: auto;');
  });

  test('전체 기간 검색은 앞으로의 일정(오늘+1년)까지 찾는다', () => {
    expect(read('app/note/journal/useJournalData.js')).toContain('addDays(todayLocalDate(), 366)');
  });
});
