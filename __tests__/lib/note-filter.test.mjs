import {
  buildNoteSearchIndex, countNotesByStatus, filterSortNotes,
} from '../../lib/note/filter.js';

const NOTES = [
  { id: 1, title: '와사비마요',   menuName: '한우쉬림프', testContent: '온도 180도', tags: '신메뉴,여름', status: '아이디어',  testDate: '2026-05-01', createdAt: '2026-05-01T00:00:00Z' },
  { id: 2, title: '트러플 피자',  menuName: '트러플',     testContent: '치즈 비율',  tags: '프리미엄',     status: '진행중',    testDate: '2026-05-10', createdAt: '2026-05-10T00:00:00Z' },
  { id: 3, title: '감자 사이드',  menuName: '감자튀김',   testContent: '바삭함',     tags: '사이드',       status: '완료',      testDate: '2026-04-20', createdAt: '2026-04-20T00:00:00Z' },
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
});

describe('countNotesByStatus', () => {
  test('상태별 개수 + all, 미등장 상태는 0', () => {
    const c = countNotesByStatus(NOTES);
    expect(c.all).toBe(3);
    expect(c['아이디어']).toBe(1);
    expect(c['진행중']).toBe(1);
    expect(c['완료']).toBe(1);
    expect(c['보고예정']).toBe(0); // 미등장 → 0으로 채움
  });
});

describe('filterSortNotes', () => {
  test('상태 필터', () => {
    const r = filterSortNotes(NOTES, { statusFilter: '완료' });
    expect(r.map(n => n.id)).toEqual([3]);
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

  test('menuName 가나다순 정렬', () => {
    // 감자튀김(ㄱ) < 트러플(ㅌ) < 한우쉬림프(ㅎ)
    expect(filterSortNotes(NOTES, { sortBy: 'menuName' }).map(n => n.id)).toEqual([3, 2, 1]);
  });

  test('testDate 내림차순 정렬', () => {
    expect(filterSortNotes(NOTES, { sortBy: 'testDate' }).map(n => n.id)).toEqual([2, 1, 3]);
  });

  test('고정(pinned) 항목이 정렬보다 우선', () => {
    const r = filterSortNotes(NOTES, { sortBy: 'testDate', pinnedIds: new Set([3]) });
    expect(r[0].id).toBe(3); // 고정이 최상단
    expect(r.map(n => n.id)).toEqual([3, 2, 1]);
  });

  test('전달된 searchIndex를 재사용', () => {
    const idx = buildNoteSearchIndex(NOTES);
    expect(filterSortNotes(NOTES, { search: '트러플', searchIndex: idx }).map(n => n.id)).toEqual([2]);
  });

  test('원본 배열을 변형하지 않음 (새 배열 반환)', () => {
    const copy = [...NOTES];
    filterSortNotes(NOTES, { sortBy: 'menuName' });
    expect(NOTES).toEqual(copy);
  });
});
