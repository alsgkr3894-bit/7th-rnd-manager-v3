import {
  buildNoteIdeaGroups,
  collectLatestRoundNotePhotos,
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

  test('필터된 독립 노트는 자동 병합하지 않고 표시 노트만 카드로 만든다', () => {
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
    expect(groups[0].notes.map(note => note.id)).toEqual(['n-2']);
    expect(groups[0].latestNote.id).toBe('n-2');
    expect(groups[1].title).toBe('갈릭 소스');
  });

  test('같은 메뉴코드라도 parentId 체인이 없으면 별도 카드로 표시한다', () => {
    const notes = [
      {
        id: 'same-code-1',
        title: '신메뉴 테스트 1차',
        menuCode: 'MENU-100',
        testRound: '1',
        testDate: '2026-03-01',
      },
      {
        id: 'same-code-2',
        title: '신메뉴 테스트 2차',
        menuCode: 'MENU-100',
        testRound: '2',
        testDate: '2026-03-02',
      },
    ];

    const groups = buildNoteIdeaGroups(notes, notes);

    expect(groups).toHaveLength(2);
    expect(groups.map(group => group.notes.map(note => note.id))).toEqual([
      ['same-code-1'],
      ['same-code-2'],
    ]);
  });

  test('제목이 달라도 parentId 차수 체인이 같으면 한 메뉴 카드로 묶는다', () => {
    const notes = [
      {
        id: 'n-2',
        parentId: 'n-1',
        title: '칠리불갈비 피자 리뉴얼 테스트 결과 및 차후 계획',
        testRound: '2',
        testDate: '2024-09-04',
        category: '피자',
      },
      {
        id: 'n-1',
        title: '크림치즈볼 및 칠리불갈비 피자 테스트',
        testRound: '1',
        testDate: '2024-09-03',
        category: '피자',
      },
    ];

    const groups = buildNoteIdeaGroups(notes, notes);

    expect(groups).toHaveLength(1);
    expect(groups[0].notes.map(note => note.id)).toEqual(['n-1', 'n-2']);
    expect(groups[0].latestNote.id).toBe('n-2');
  });

  test('부모 노트가 목록에서 빠져도 같은 parentId를 가진 차수는 한 카드로 묶는다', () => {
    const notes = [
      {
        id: 'n-2',
        parentId: 'n-1',
        title: '불고기 피자 2차 기록',
        testRound: '2',
      },
      {
        id: 'n-3',
        parentId: 'n-1',
        title: '불고기 피자 3차 기록',
        testRound: '3',
      },
    ];

    const groups = buildNoteIdeaGroups(notes, notes);

    expect(groups).toHaveLength(1);
    expect(groups[0].notes.map(note => note.id)).toEqual(['n-2', 'n-3']);
  });

  test('날짜순 카드 정렬은 개별 행이 아니라 표시되는 마지막 차수 날짜를 기준으로 한다', () => {
    const notes = [
      {
        id: 'old-1',
        title: '숯불닭구이 테스트',
        testRound: '1',
        testDate: '2026-06-25',
      },
      {
        id: 'old-2',
        parentId: 'old-1',
        title: '숯불닭구이 테스트',
        testRound: '2',
        testDate: '2024-08-14',
      },
      {
        id: 'old-3',
        parentId: 'old-2',
        title: '숯불닭구이 테스트',
        testRound: '3',
        testDate: '2024-08-21',
      },
      {
        id: 'new-1',
        title: '타코피자 테스트',
        testRound: '1',
        testDate: '2024-10-18',
      },
      {
        id: 'new-2',
        parentId: 'new-1',
        title: '타코피자 테스트',
        testRound: '2',
        testDate: '2024-10-19',
      },
    ];

    const groups = buildNoteIdeaGroups(notes, notes, { sortBy: 'testDate' });

    expect(groups.map(group => group.title)).toEqual(['타코피자 테스트', '숯불닭구이 테스트']);
    expect(groups.map(group => group.latestNote.testDate)).toEqual(['2024-10-19', '2024-08-21']);
  });

  test('출시 차수가 있으면 이후 테스트 차수보다 출시 노트를 대표 완성본으로 표시한다', () => {
    const notes = [
      {
        id: 'n-1',
        title: '갈릭 피자',
        testRound: '1',
        testDate: '2024-08-20',
        status: '테스트',
      },
      {
        id: 'n-2',
        parentId: 'n-1',
        title: '갈릭 피자',
        testRound: '2',
        testDate: '2024-08-21',
        status: '출시',
        photos: [{ data: 'release-photo' }],
      },
      {
        id: 'n-3',
        parentId: 'n-2',
        title: '갈릭 피자',
        testRound: '3',
        testDate: '2024-08-22',
        status: '테스트',
        photos: [{ data: 'later-test-photo' }],
      },
    ];

    const groups = buildNoteIdeaGroups(notes, notes);

    expect(groups[0].latestNote.id).toBe('n-2');
    expect(collectLatestRoundNotePhotos(groups[0].notes, 1).map(photo => photo.data)).toEqual([
      'later-test-photo',
    ]);
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

  test('메뉴 아이디어 대표 사진은 마지막 차수 사진을 우선 사용한다', () => {
    const notes = [
      {
        id: 'n-1',
        testRound: '1',
        updatedAt: '2026-05-01T00:00:00.000Z',
        photos: [{ data: 'round-1-photo', uploadedAt: '2026-06-01T00:00:00.000Z' }],
      },
      {
        id: 'n-2',
        testRound: '2',
        updatedAt: '2026-05-02T00:00:00.000Z',
        photos: [{ data: 'round-2-photo' }],
      },
    ];

    expect(collectLatestRoundNotePhotos(notes, 3).map(photo => photo.data)).toEqual([
      'round-2-photo',
    ]);
  });
});
