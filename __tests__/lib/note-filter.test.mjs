import {
  CHECKLIST_NOTE_TYPE,
  buildNoteSearchIndex,
  countNotesByStatus,
  filterKanbanNotes,
  filterNoteListNotes,
  filterSortNotes,
  isChecklistNote,
  isJournalNote,
} from '../../lib/note/filter.js';

const NOTES = [
  {
    id: 1,
    title: '와사비마요',
    menuName: '한우쉬림프',
    testContent: '온도 180도',
    tags: '신메뉴,여름',
    status: '아이디어',
    testDate: '2026-05-01',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 2,
    title: '트러플 피자',
    menuName: '트러플',
    testContent: '치즈 비율',
    tags: '프리미엄',
    status: '진행중',
    testDate: '2026-05-10',
    createdAt: '2026-05-10T00:00:00Z',
  },
  {
    id: 3,
    title: '감자 사이드',
    menuName: '감자튀김',
    testContent: '바삭함',
    tags: '사이드',
    status: '완료',
    testDate: '2026-04-20',
    createdAt: '2026-04-20T00:00:00Z',
  },
];

describe('buildNoteSearchIndex', () => {
  test('id별 소문자 결합 문자열 생성', () => {
    const idx = buildNoteSearchIndex(NOTES);
    expect(idx.get(1)).toContain('와사비마요');
    expect(idx.get(1)).toContain('한우쉬림프');
    expect(idx.get(2)).toBe('트러플 피자\n트러플\n치즈 비율\n프리미엄');
  });
  test('빈/누락 입력 안전', () => {
    expect(buildNoteSearchIndex(null).size).toBe(0);
    expect(buildNoteSearchIndex([{ id: 9 }]).get(9)).toBe('\n\n\n');
  });

  test('손상된 검색 필드는 표시 가능한 값만 인덱싱한다', () => {
    const idx = buildNoteSearchIndex([
      null,
      {
        id: 10,
        title: {},
        menuName: 123,
        testContent: ['토핑', {}, '소스'],
        tags: null,
      },
    ]);

    expect(idx.get(10)).toBe('\n123\n토핑,소스\n');
  });
});

describe('countNotesByStatus', () => {
  test('상태별 개수 + all, 미등장 상태는 0', () => {
    const c = countNotesByStatus(NOTES);
    expect(c.all).toBe(3);
    expect(c['테스트']).toBe(1);
    expect(c['진행중']).toBe(1);
    expect(c['완료']).toBe(1);
    expect(c['출시예정']).toBeUndefined();
  });

  test('비배열 입력과 깨진 상태값을 안전하게 처리한다', () => {
    expect(countNotesByStatus(null).all).toBe(0);
    const c = countNotesByStatus([null, { status: {} }, { status: 123 }], ['123']);
    expect(c).toMatchObject({ all: 2, 123: 1 });
    expect(c['[object Object]']).toBeUndefined();
  });

  test('차수 묶음 상태는 마지막 차수의 메뉴 상태 1건으로 센다', () => {
    const c = countNotesByStatus([
      { id: 1, title: '불고기 피자', testRound: '1', status: '폐기' },
      { id: 2, title: '불고기 피자', testRound: '2', parentId: 1, status: '보류' },
    ]);

    expect(c.all).toBe(1);
    expect(c['폐기']).toBe(0);
    expect(c['보류']).toBe(1);
  });

  test('같은 메뉴코드라도 parentId 체인이 없으면 상태를 독립적으로 센다', () => {
    const c = countNotesByStatus([
      { id: 1, title: '로제 피자 1차', menuCode: 'MENU-200', testRound: '1', status: '테스트' },
      { id: 2, title: '로제 피자 2차', menuCode: 'MENU-200', testRound: '2', status: '보류' },
    ]);

    expect(c.all).toBe(2);
    expect(c['테스트']).toBe(1);
    expect(c['보류']).toBe(1);
  });

  test('출시 차수가 있으면 뒤에 테스트 차수가 있어도 출시를 완성본 상태로 센다', () => {
    const c = countNotesByStatus([
      { id: 1, title: '갈릭 피자', testRound: '1', status: '테스트' },
      { id: 2, title: '갈릭 피자', testRound: '2', parentId: 1, status: '출시' },
      { id: 3, title: '갈릭 피자', testRound: '3', parentId: 2, status: '테스트' },
    ]);

    expect(c.all).toBe(1);
    expect(c['출시']).toBe(1);
    expect(c['테스트']).toBe(0);
  });
});

describe('filterSortNotes', () => {
  test('상태 필터', () => {
    const r = filterSortNotes(NOTES, { statusFilter: '완료' });
    expect(r.map(n => n.id)).toEqual([3]);
  });

  test('상태 필터는 개별 차수가 아니라 최신 차수의 메뉴 상태를 기준으로 한다', () => {
    const notes = [
      {
        id: 1,
        title: '칠리 피자',
        testRound: '1',
        status: '폐기',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        title: '칠리 피자',
        testRound: '2',
        parentId: 1,
        status: '보류',
        createdAt: '2026-01-02T00:00:00Z',
      },
    ];

    expect(filterSortNotes(notes, { statusFilter: '폐기' })).toEqual([]);
    expect(filterSortNotes(notes, { statusFilter: '보류' }).map(n => n.id)).toEqual([2, 1]);
  });

  test('같은 메뉴코드의 독립 노트는 상태 필터에서도 자동으로 합쳐지지 않는다', () => {
    const notes = [
      {
        id: 1,
        title: '로제 피자 1차',
        menuCode: 'MENU-200',
        testRound: '1',
        status: '테스트',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        title: '로제 피자 2차',
        menuCode: 'MENU-200',
        testRound: '2',
        status: '보류',
        createdAt: '2026-01-02T00:00:00Z',
      },
    ];

    expect(filterSortNotes(notes, { statusFilter: '테스트' }).map(n => n.id)).toEqual([1]);
    expect(filterSortNotes(notes, { statusFilter: '보류' }).map(n => n.id)).toEqual([2]);
  });

  test('출시 차수는 이후 테스트 기록보다 우선해 상태 필터의 완성본 기준이 된다', () => {
    const notes = [
      {
        id: 1,
        title: '치즈 피자',
        testRound: '1',
        status: '테스트',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        title: '치즈 피자',
        testRound: '2',
        parentId: 1,
        status: '출시',
        createdAt: '2026-01-02T00:00:00Z',
      },
      {
        id: 3,
        title: '치즈 피자',
        testRound: '3',
        parentId: 2,
        status: '테스트',
        createdAt: '2026-01-03T00:00:00Z',
      },
    ];

    expect(filterSortNotes(notes, { statusFilter: '테스트' })).toEqual([]);
    expect(filterSortNotes(notes, { statusFilter: '출시' }).map(n => n.id)).toEqual([3, 2, 1]);
  });

  test('검색은 title/menuName/testContent/tags 전체 대상', () => {
    expect(filterSortNotes(NOTES, { search: '쉬림프' }).map(n => n.id)).toEqual([1]);
    expect(filterSortNotes(NOTES, { search: '치즈' }).map(n => n.id)).toEqual([2]);
    expect(filterSortNotes(NOTES, { search: '사이드' }).map(n => n.id)).toEqual([3]);
  });

  test('대소문자 무관 검색', () => {
    const notes = [{ id: 1, title: 'Truffle', status: '아이디어', createdAt: '2026-01-01' }];
    expect(filterSortNotes(notes, { search: 'truffle' }).length).toBe(1);
  });

  test('createdAt 내림차순 기본 정렬', () => {
    expect(filterSortNotes(NOTES, {}).map(n => n.id)).toEqual([2, 1, 3]);
  });

  test('제목 가나다순 정렬', () => {
    expect(filterSortNotes(NOTES, { sortBy: 'menuName' }).map(n => n.id)).toEqual([3, 1, 2]);
  });

  test('testDate 내림차순 정렬', () => {
    expect(filterSortNotes(NOTES, { sortBy: 'testDate' }).map(n => n.id)).toEqual([2, 1, 3]);
  });

  test('기본 최신순에서는 고정(pinned) 항목이 상단에 표시된다', () => {
    const r = filterSortNotes(NOTES, { sortBy: 'createdAt', pinnedIds: new Set([3]) });
    expect(r[0].id).toBe(3); // 고정이 최상단
    expect(r.map(n => n.id)).toEqual([3, 2, 1]);
  });

  test('날짜순에서는 고정 항목보다 테스트 날짜 정렬을 우선한다', () => {
    const r = filterSortNotes(NOTES, { sortBy: 'testDate', pinnedIds: new Set([3]) });
    expect(r.map(n => n.id)).toEqual([2, 1, 3]);
  });

  test('전달된 searchIndex를 재사용', () => {
    const idx = buildNoteSearchIndex(NOTES);
    expect(filterSortNotes(NOTES, { search: '트러플', searchIndex: idx }).map(n => n.id)).toEqual([
      2,
    ]);
  });

  test('원본 배열을 변형하지 않음 (새 배열 반환)', () => {
    const copy = [...NOTES];
    filterSortNotes(NOTES, { sortBy: 'menuName' });
    expect(NOTES).toEqual(copy);
  });

  test('손상된 입력과 정렬 필드를 안전하게 처리한다', () => {
    expect(filterSortNotes(null)).toEqual([]);

    const notes = [
      null,
      {
        id: 1,
        status: '출시예정',
        brand: {},
        menuName: {},
        testDate: {},
        createdAt: {},
        title: {},
      },
      {
        id: 2,
        status: '출시예정',
        brand: 'main',
        menuName: 123,
        testDate: 456,
        createdAt: '2026-06-01',
        title: '정상',
      },
    ];

    expect(filterSortNotes(notes, { search: {}, statusFilter: '보류' }).map(n => n.id)).toEqual([
      2, 1,
    ]);
    expect(filterSortNotes(notes, { sortBy: 'menuName' }).map(n => n.id)).toEqual([2, 1]);
    expect(filterSortNotes(notes, { sortBy: 'testDate' }).map(n => n.id)).toEqual([2, 1]);
    expect(filterSortNotes(notes, { brandFilter: 'main' }).map(n => n.id)).toEqual([2, 1]);
  });
});

describe('checklist note helpers', () => {
  test('체크리스트와 연구일지 노트를 식별하고 칸반 목록에서 제외한다', () => {
    const notes = [
      { id: 1, title: '일반 노트', noteType: '메뉴개발' },
      { id: 2, title: '오늘 한 일', noteType: CHECKLIST_NOTE_TYPE },
      { id: 3, title: '2026-06-24 연구일지', noteType: '연구일지' },
    ];

    expect(isChecklistNote(notes[0])).toBe(false);
    expect(isChecklistNote(notes[1])).toBe(true);
    expect(isJournalNote(notes[2])).toBe(true);
    expect(filterNoteListNotes(notes).map(note => note.id)).toEqual([1]);
    expect(filterKanbanNotes(notes).map(note => note.id)).toEqual([1]);
  });
});
