import {
  buildNoteIdeaGroups,
  collectRecentNotePhotos,
  noteIdeaTitle,
  noteRoundNumber,
} from '@/app/note/noteIdeaGroups';

describe('note idea groups', () => {
  test('제목 끝 차수 표현을 제거해 같은 메뉴 아이디어로 묶는다', () => {
    expect(noteIdeaTitle({ title: '불고기 피자 1차' })).toBe('불고기 피자');
    expect(noteIdeaTitle({ title: '불고기 피자 - 2차 테스트' })).toBe('불고기 피자');
    expect(noteIdeaTitle({ title: '불고기 피자' })).toBe('불고기 피자');
  });

  test('테스트 차수는 testRound를 우선하고 제목 fallback도 읽는다', () => {
    expect(noteRoundNumber({ title: '치킨 피자 2차', testRound: '3' })).toBe(3);
    expect(noteRoundNumber({ title: '치킨 피자 2차' })).toBe(2);
  });

  test('필터된 노트를 메뉴별로 묶고 차수 순서로 정렬한다', () => {
    const notes = [
      {
        id: 'n-2',
        title: '불고기 피자',
        testRound: '2',
        testDate: '2026-02-02',
        category: '피자',
      },
      {
        id: 'n-1',
        title: '불고기 피자',
        testRound: '1',
        testDate: '2026-02-01',
        category: '피자',
      },
      {
        id: 's-1',
        title: '갈릭 소스 1차',
        testDate: '2026-02-03',
        category: '소스',
      },
    ];

    const groups = buildNoteIdeaGroups(notes, [notes[0], notes[2]]);

    expect(groups).toHaveLength(2);
    expect(groups[0].title).toBe('불고기 피자');
    expect(groups[0].notes.map(note => note.id)).toEqual(['n-1', 'n-2']);
    expect(groups[0].latestNote.id).toBe('n-2');
    expect(groups[1].title).toBe('갈릭 소스');
  });

  test('노트 목록 사진은 업로드 시각 기준 최신 사진부터 고른다', () => {
    const notes = [
      {
        id: 'n-1',
        updatedAt: '2026-02-01T00:00:00.000Z',
        photos: [{ data: 'old-first' }, { data: 'old-last' }],
      },
      {
        id: 'n-2',
        updatedAt: '2026-01-01T00:00:00.000Z',
        photos: [
          { data: 'uploaded-old', uploadedAt: '2026-03-01T00:00:00.000Z' },
          { data: 'uploaded-new', uploadedAt: '2026-04-01T00:00:00.000Z' },
        ],
      },
    ];

    expect(collectRecentNotePhotos(notes, 4).map(photo => photo.data)).toEqual([
      'uploaded-new',
      'uploaded-old',
      'old-last',
      'old-first',
    ]);
  });
});
