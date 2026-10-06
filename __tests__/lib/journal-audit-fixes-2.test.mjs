import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { expandInWindows, groupJournalEntries } from '../../app/note/journal/journalEntries.js';
import { expandOccurrences } from '../../app/note/calendar/_recurrence.js';
import { journalEntryMatchesFilter } from '../../app/note/journal/journalSearch.js';
import { noteDetailPairs } from '../../lib/note/display.js';

// 2026-10-06 연구일지 2차 점검에서 나온 것들.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('전체 기간 검색이 오래된 매일 반복 일정을 1000일에서 끊던 문제', () => {
  const daily = { id: 1, title: '매일 점검', date: '2024-01-01', repeatType: 'daily' };

  test('한 번에 펼치면 1000일에서 끊기지만, 1년 단위로 나눠 펼치면 끝까지 나온다', () => {
    const once = expandOccurrences(daily, '2023-05-01', '2027-10-07');
    expect(once.length).toBe(1000);
    expect(once.includes('2026-10-06')).toBe(false);
    const windows = expandInWindows(daily, '2023-05-01', '2027-10-07');
    expect(windows[0]).toBe('2024-01-01');
    expect(windows.includes('2026-10-06')).toBe(true);
    expect(windows[windows.length - 1]).toBe('2027-10-07');
    expect(new Set(windows).size).toBe(windows.length);
  });

  test('주간·월간·단일 일정도 나눠 펼쳐도 같은 결과', () => {
    const weekly = { date: '2025-01-06', repeatType: 'weekly' };
    const monthly = { date: '2025-01-31', repeatType: 'monthly' };
    const once = { date: '2026-02-03' };
    for (const schedule of [weekly, monthly, once]) {
      expect(expandInWindows(schedule, '2025-01-01', '2026-12-31')).toEqual(
        expandOccurrences(schedule, '2025-01-01', '2026-12-31')
      );
    }
    const entries = groupJournalEntries([], [daily], '2026-10-01', '2026-10-03');
    expect(entries.map(entry => entry.date)).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
  });
});

describe('목록·필터', () => {
  test("본문·사진이 빈 일지는 '일지 쓴 날'로 세지 않는다(예전 칸만 있는 일지는 센다)", () => {
    const base = { date: '2026-10-01', notes: [], schedules: [] };
    expect(journalEntryMatchesFilter({ ...base, journal: { testContent: '' } }, 'journal')).toBe(
      false
    );
    expect(journalEntryMatchesFilter({ ...base, journal: { nextAction: '다음' } }, 'journal')).toBe(
      true
    );
    expect(
      journalEntryMatchesFilter({ ...base, journal: { photos: [{ data: 'x' }] } }, 'journal')
    ).toBe(true);
  });

  test('넓은 검색어는 50일씩 보여주고 더 보기로 이어 본다', () => {
    const list = read('app/note/journal/_JournalMonthList.jsx');
    expect(list).toContain('const LIST_PAGE_SIZE = 50;');
    expect(list).toContain('entries.slice(0, visibleCount)');
    expect(list).toContain('더 보기 ({entries.length - visibleCount}일 남음)');
    expect(read('app/note/journal/page.jsx')).toContain('useDeferredValue(search)');
  });

  test('좁은 화면: 목록 줄은 날짜를 윗줄로, 저장 바 버튼 글자는 한 줄로', () => {
    const css = read('app/styles/features/note.css').replace(/\r\n/g, '\n');
    expect(css).toContain('.journal-list-row-date {\n    grid-column: 1 / -1;');
    expect(css).toContain('.form-save-bar-actions .btn {\n  white-space: nowrap;');
    expect(read('app/note/journal/_JournalListRow.jsx')).toContain('className="journal-list-row"');
  });
});

describe('작성·저장', () => {
  const form = read('app/note/journal/useJournalForm.js');

  test('저장은 기존 일지의 제목·분류·태그를 지키고, 바뀐 게 없으면 다시 쓰지 않는다', () => {
    expect(form).toContain('const title = journalEntry?.title || `${date} 연구일지`;');
    expect(form).toContain("category: journalEntry?.category || '기타',");
    expect(form).toContain("tags: journalEntry?.tags || '연구일지',");
    expect(form).toContain('if (journalEntry && !journalDirty) {');
  });

  test('연타 저장으로 새 일지가 둘 생기지 않는다(ref 잠금 + 방금 만든 id로 고침)', () => {
    expect(form).toContain('if (!canEdit || saving || savingRef.current) return;');
    expect(form).toContain('createdRef.current = { date, id: await addNote(payload) }');
    expect(form).toContain('const targetId = journalEntry?.id ?? createdId;');
  });

  test('되돌리기는 바뀐 게 있을 때만, 확인을 받고 한다', () => {
    expect(form).toContain('if (!journalDirty) return;');
    expect(form).toContain("window.confirm('작성 중인 내용을 저장된 상태로 되돌릴까요?')");
  });

  test('사진 칸은 뷰어·저장 중엔 보기만(문서 붙여넣기도 받지 않음)', () => {
    const photo = read('app/note/_NotePhotoSection.jsx');
    expect(photo).toContain("const editable = !disabled && typeof onChange === 'function';");
    expect(photo).toContain('if (!editable) return undefined;');
    expect(read('app/note/journal/_JournalEntryEditor.jsx')).toContain('disabled={disabled}');
  });

  test('빠른 날짜 입력은 다른 날짜로 읽힐 때만 이동 확인을 묻는다', () => {
    const guard = read('app/note/journal/useJournalLeaveGuard.js');
    expect(guard).toContain('parseNoteQuickDate(raw, { referenceDate: nav.date })');
    expect(guard).toContain('if (target && target !== nav.date && !confirmLeave()) return;');
  });

  test('화면 안에서 날짜를 바꾸면 주소 ?date=도 따라간다(새로고침 시 옛 날짜로 안 돌아감)', () => {
    const nav = read('app/note/journal/useJournalNavigation.js');
    expect(nav).toContain('function changeDate(value) {');
    expect(nav).toContain("window.history.replaceState(window.history.state, '', url);");
    expect(nav).toContain('setDate: changeDate,');
  });
});

describe('연결 모듈', () => {
  test('캘린더 체크리스트는 연구일지 화면과 같은 일지(가장 먼저 만든 것)에 쓴다', () => {
    const src = read('app/note/calendar/useTodayChecklist.js');
    expect(src).toContain('.filter(note => note?.noteType === JOURNAL_NOTE_TYPE)');
    expect(src).toContain('localeCompare(String(b.createdAt');
  });

  test('홈 노트 KPI·신메뉴 파이프라인은 연구일지를 메뉴개발 노트로 세지 않는다', () => {
    const src = read('lib/stats/note-stats.js');
    expect(src.match(/filterNoteListNotes\(await getAllNotesCached\(\)\)/g)).toHaveLength(3);
  });

  test('연구일지는 보조 칸 목록이 없다(옛 칸은 보고서 본문에 합쳐 보인다)', () => {
    expect(noteDetailPairs({ noteType: '연구일지', tasteEval: 'x', nextAction: 'y' })).toEqual([]);
  });

  test('노트 수정 화면에서 연구일지로 보낼 때 로컬 날짜 기준', () => {
    expect(read('app/note/[id]/page.jsx')).toContain('const day = noteDayKey(note);');
  });
});
