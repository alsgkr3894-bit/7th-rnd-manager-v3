import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  EMPTY_JOURNAL_FORM,
  buildJournalNoteFromForm,
  hasJournalText,
  journalContentFields,
  journalFormFromEntry,
} from '../../app/note/journal/journalForm.js';
import {
  entryPhotos,
  entryPreviewText,
  journalEntryMatches,
  journalEntryMatchesFilter,
  splitHighlight,
} from '../../app/note/journal/journalSearch.js';
import { groupJournalEntries } from '../../app/note/journal/useJournalData.js';

// 2026-10-06: 연구일지 작성 칸을 '오늘 내용 보고서' 한 칸으로 줄이고 목록을 보기 편하게 바꿨다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const legacyEntry = {
  id: 7,
  noteType: '연구일지',
  testDate: '2026-07-03',
  title: '2026-07-03 연구일지',
  status: '테스트',
  tags: '연구일지',
  testContent: '메뉴개발노트 90%정리 완료',
  tasteEval: '식감 좋음',
  improvements: '소스 줄이기',
  nextAction: '월요일 스테이크 테스트',
  materials: '스테이크 200g',
  photos: [{ data: 'data:image/jpeg;base64,AAA', name: 'a.jpg' }],
};

describe('오늘 내용 보고서 한 칸', () => {
  test('본문만 있는 일지는 그대로 연다', () => {
    const form = journalFormFromEntry({ testContent: '오늘 촬영\n폐가전 정리', photos: [] });
    expect(form).toEqual({ report: '오늘 촬영\n폐가전 정리', photos: [] });
  });

  test('예전 칸(테스트 결과·개선·다음 일정·재료)은 소제목과 함께 한 칸에 모두 들어간다', () => {
    const { report, photos } = journalFormFromEntry(legacyEntry);
    for (const text of [
      '메뉴개발노트 90%정리 완료',
      '식감 좋음',
      '소스 줄이기',
      '월요일 스테이크 테스트',
      '스테이크 200g',
    ]) {
      expect(report).toContain(text);
    }
    // 예전 작성 화면과 같은 묶음: 테스트 결과 = tasteEval+improvements, 다음 일정 = nextAction+materials
    expect(report).toContain('[테스트 결과]\n식감 좋음\n소스 줄이기');
    expect(report).toContain('[다음 일정]\n월요일 스테이크 테스트\n스테이크 200g');
    expect(report).not.toContain('[재료]');
    expect(report.indexOf('메뉴개발노트')).toBe(0);
    expect(photos).toBe(legacyEntry.photos);
  });

  test('저장하면 본문은 testContent 한 칸, 예전 칸은 비우고 사진·상태·태그는 유지', () => {
    const form = journalFormFromEntry(legacyEntry);
    const saved = buildJournalNoteFromForm('2026-07-03', form, legacyEntry);
    expect(saved.testContent).toBe(form.report.trim());
    expect(saved).toMatchObject({ tasteEval: '', improvements: '', nextAction: '', materials: '' });
    expect(saved.photos).toBe(legacyEntry.photos);
    expect(saved).toMatchObject({
      id: 7,
      status: '테스트',
      tags: '연구일지',
      noteType: '연구일지',
    });
    // 저장한 것을 다시 열면 같은 내용(두 번 합쳐지지 않음)
    expect(journalFormFromEntry(saved).report).toBe(saved.testContent);
  });

  test('열기만 하면 수정 중이 아니다(같은 변환 결과로 비교)', () => {
    expect(JSON.stringify(journalFormFromEntry(legacyEntry))).toBe(
      JSON.stringify(journalFormFromEntry(legacyEntry))
    );
    expect(journalFormFromEntry(null)).toBe(EMPTY_JOURNAL_FORM);
  });

  test('내용·사진 유무 판정과 저장 칸', () => {
    expect(hasJournalText({ report: '  ', photos: [] })).toBe(false);
    expect(hasJournalText({ report: '', photos: [{ data: 'x' }] })).toBe(true);
    expect(journalContentFields({ report: ' 본문 ' })).toEqual({
      testContent: '본문',
      tasteEval: '',
      improvements: '',
      nextAction: '',
      materials: '',
    });
  });

  test('작성 화면은 칸 하나와 사진만 둔다', () => {
    const editor = read('app/note/journal/_JournalEntryEditor.jsx');
    expect(editor).toContain('label="오늘 내용 보고서"');
    expect(editor).not.toContain('2. 테스트 결과');
    expect(editor).not.toContain('3. 다음 일정');
    expect(editor).toContain('<NotePhotoSection');
    expect(read('app/note/journal/useJournalForm.js')).toContain(
      '...journalContentFields(journalForm)'
    );
  });
});

describe('연구일지 목록', () => {
  const journal = { ...legacyEntry, createdAt: '2026-07-03T01:00:00Z' };
  const sample = {
    id: 9,
    noteType: '샘플',
    testDate: '2026-07-03',
    title: '까망베르 샘플',
    photos: [{ data: 'data:image/jpeg;base64,BBB' }, { data: 'data:image/jpeg;base64,AAA' }],
  };
  const september = {
    id: 11,
    noteType: '연구일지',
    testDate: '2026-09-28',
    testContent: '고구마피자 촬영',
  };
  const schedules = [{ id: 1, title: '스테이크 재료 주문', date: '2026-07-06' }];

  test('기간으로 날짜별 묶음을 만든다(전체 기간 검색은 다른 달도 찾는다)', () => {
    const all = groupJournalEntries(
      [journal, sample, september],
      schedules,
      '2026-07-01',
      '2026-09-30'
    );
    expect(all.map(entry => entry.date)).toEqual(['2026-09-28', '2026-07-06', '2026-07-03']);
    const july = all.find(entry => entry.date === '2026-07-03');
    expect(july.journal).toBe(journal);
    expect(all.filter(entry => journalEntryMatches(entry, '고구마')).map(e => e.date)).toEqual([
      '2026-09-28',
    ]);
    const julyOnly = groupJournalEntries([journal, september], [], '2026-07-01', '2026-07-31');
    expect(julyOnly.map(entry => entry.date)).toEqual(['2026-07-03']);
  });

  test('사진은 그날 기록 전체에서 중복 없이 모으고, 필터가 맞게 거른다', () => {
    const [entry] = groupJournalEntries([journal, sample], [], '2026-07-03', '2026-07-03');
    expect(entryPhotos(entry).map(photo => photo.data)).toEqual([
      'data:image/jpeg;base64,AAA',
      'data:image/jpeg;base64,BBB',
    ]);
    const scheduleOnly = { date: '2026-07-06', notes: [], schedules, journal: null };
    expect(journalEntryMatchesFilter(entry, 'journal')).toBe(true);
    expect(journalEntryMatchesFilter(scheduleOnly, 'journal')).toBe(false);
    expect(journalEntryMatchesFilter(scheduleOnly, 'photos')).toBe(false);
    expect(journalEntryMatchesFilter(scheduleOnly, 'all')).toBe(true);
  });

  test('미리보기는 일지 본문(예전 칸 포함), 검색 중이면 검색어가 든 문장을 고른다', () => {
    const [entry] = groupJournalEntries([journal, sample], [], '2026-07-03', '2026-07-03');
    expect(entryPreviewText(entry, '')).toContain('메뉴개발노트');
    expect(entryPreviewText(entry, '스테이크')).toContain('스테이크');
    // 검색 중 미리보기는 줄바꿈을 이어 붙여 검색어가 3줄 안에 보이게 한다
    expect(entryPreviewText(entry, '스테이크')).not.toContain('\n');
    expect(entryPreviewText(entry, '까망베르')).toContain('까망베르 샘플');
    const longText = `${'가'.repeat(100)}키워드`;
    expect(
      entryPreviewText(
        { notes: [], schedules: [], journal: { testContent: longText } },
        '키워드'
      ).startsWith('…')
    ).toBe(true);
  });

  test('검색어 강조 분할(대소문자 무시, 원문 유지)', () => {
    expect(splitHighlight('Steak 스테이크 steak', 'steak')).toEqual([
      { text: 'Steak', match: true },
      { text: ' 스테이크 ', match: false },
      { text: 'steak', match: true },
    ]);
    expect(splitHighlight('본문', '')).toEqual([{ text: '본문', match: false }]);
    expect(splitHighlight('', 'x')).toEqual([]);
  });

  test('목록 화면: 필터 칩·펼치기·사진 크게 보기·전체 기간 검색 안내', () => {
    const list = ['_JournalMonthList.jsx', '_JournalListRow.jsx', '_JournalListParts.jsx']
      .map(file => read(`app/note/journal/${file}`))
      .join('\n');
    expect(list).toContain('JOURNAL_LIST_FILTERS.map');
    expect(list).toContain("{expanded ? '접기' : '펼치기'}");
    expect(list).toContain('onPhotoClick?.(photo)');
    expect(list).toContain('전체 기간');
    expect(list).not.toContain('dangerouslySetInnerHTML');
    const page = read('app/note/journal/page.jsx');
    expect(page).toContain('onPhotoClick={setPreviewPhoto}');
    expect(page).toContain('useJournalData({ date, month, search, listFilter })');
  });
});
