import { describe, expect, test } from '@jest/globals';

const { buildNoteDropMergePlan, buildNoteMergePlan, buildNoteUnmergePlan, noteMergeBaseTitle } =
  await import('../../lib/note/merge.js');

describe('note merge helpers', () => {
  test('선택한 노트를 날짜순 차수 체인으로 묶는다', () => {
    const notes = [
      { id: 7, title: '트러플 피자 3차', testDate: '2026-03-03' },
      { id: 3, title: '트러플 피자 1차', testDate: '2026-03-01' },
      { id: 5, title: '트러플 피자 2차', testDate: '2026-03-02' },
    ];

    const plan = buildNoteMergePlan(notes, new Set([7, 3, 5]));

    expect(plan.canMerge).toBe(true);
    expect(plan.title).toBe('트러플 피자');
    expect(plan.changes).toEqual([
      {
        id: 3,
        note: notes[1],
        patch: {
          title: '트러플 피자',
          menuName: '트러플 피자',
          status: '테스트',
          testRound: '1',
          parentId: null,
        },
      },
      {
        id: 5,
        note: notes[2],
        patch: {
          title: '트러플 피자',
          menuName: '트러플 피자',
          status: '테스트',
          testRound: '2',
          parentId: 3,
        },
      },
      {
        id: 7,
        note: notes[0],
        patch: {
          title: '트러플 피자',
          menuName: '트러플 피자',
          status: '테스트',
          testRound: '3',
          parentId: 5,
        },
      },
    ]);
  });

  test('차수 접미사가 없어도 가장 오래된 제목을 기준 제목으로 사용한다', () => {
    const plan = buildNoteMergePlan(
      [
        { id: 'b', title: '갈릭 소스', testDate: '2026-01-02' },
        { id: 'a', title: '갈릭 소스 테스트 1차', testDate: '2026-01-01' },
      ],
      ['a', 'b']
    );

    expect(plan.title).toBe('갈릭 소스');
    expect(plan.changes.map(change => change.patch.testRound)).toEqual(['1', '2']);
  });

  test('선택한 노트가 기존 차수 체인에 속하면 체인 전체를 함께 묶는다', () => {
    const notes = [
      { id: 10, title: '감자 피자 1차', testDate: '2026-04-01' },
      { id: 11, title: '감자 피자 2차', parentId: 10, testDate: '2026-04-02' },
      { id: 12, title: '감자 피자 3차', parentId: 11, testDate: '2026-04-03' },
      { id: 20, title: '감자 피자 추가 테스트', testDate: '2026-04-04' },
    ];

    const plan = buildNoteMergePlan(notes, [11, 20]);

    expect(plan.canMerge).toBe(true);
    expect(plan.selectedCount).toBe(2);
    expect(plan.mergedCount).toBe(4);
    expect(plan.changes.map(change => change.id)).toEqual([10, 11, 12, 20]);
    expect(plan.changes.map(change => change.patch.testRound)).toEqual(['1', '2', '3', '4']);
    expect(plan.changes.map(change => change.patch.parentId)).toEqual([null, 10, 11, 12]);
    expect(plan.changes.every(change => change.patch.status === '테스트')).toBe(true);
  });

  test('드롭 병합은 대상 카드 차수를 먼저 유지하고 끌어온 카드를 뒤에 붙인다', () => {
    const notes = [
      { id: 1, title: '타깃 메뉴 1차', testRound: '1', testDate: '2026-05-03' },
      { id: 2, title: '타깃 메뉴 2차', parentId: 1, testRound: '2', testDate: '2026-05-04' },
      { id: 9, title: '이전 아이디어 1차', testRound: '1', testDate: '2026-04-01' },
      { id: 10, title: '이전 아이디어 2차', parentId: 9, testRound: '2', testDate: '2026-04-02' },
    ];

    const plan = buildNoteDropMergePlan(notes, [9], [1]);

    expect(plan.canMerge).toBe(true);
    expect(plan.title).toBe('타깃 메뉴');
    expect(plan.sourceCount).toBe(2);
    expect(plan.targetCount).toBe(2);
    expect(plan.changes.map(change => change.id)).toEqual([1, 2, 9, 10]);
    expect(plan.changes.map(change => change.patch.testRound)).toEqual(['1', '2', '3', '4']);
    expect(plan.changes.map(change => change.patch.parentId)).toEqual([null, 1, 2, 9]);
    expect(plan.changes.every(change => change.patch.status === '테스트')).toBe(true);
  });

  test('병합하면 마지막 차수 상태를 메뉴 상태로 전체 차수에 적용한다', () => {
    const plan = buildNoteMergePlan(
      [
        { id: 1, title: '고구마 피자 1차', testRound: '1', status: '폐기' },
        { id: 2, title: '고구마 피자 2차', testRound: '2', status: '보류' },
      ],
      [1, 2]
    );

    expect(plan.changes.map(change => change.patch.status)).toEqual(['보류', '보류']);
  });

  test('출시 차수가 있으면 이후 테스트 차수보다 출시 상태를 병합 메뉴 상태로 적용한다', () => {
    const plan = buildNoteMergePlan(
      [
        { id: 1, title: '고르곤 피자 1차', testRound: '1', status: '테스트' },
        { id: 2, title: '고르곤 피자 2차', testRound: '2', status: '출시' },
        { id: 3, title: '고르곤 피자 3차', testRound: '3', status: '테스트' },
      ],
      [1, 2, 3]
    );

    expect(plan.changes.map(change => change.patch.status)).toEqual(['출시', '출시', '출시']);
  });

  test('선택 노트가 2개 미만이면 병합하지 않는다', () => {
    const plan = buildNoteMergePlan([{ id: 1, title: '단일 노트' }], [1]);

    expect(plan.canMerge).toBe(false);
    expect(plan.reason).toContain('2개 이상');
  });

  test('분리 계획은 parentId 연결만 끊고 저장된 사진과 내용은 건드리지 않는다', () => {
    const notes = [
      {
        id: 1,
        title: '로제 피자 1차',
        testRound: '1',
        parentId: null,
        testContent: '소스 유지',
        photos: [{ data: 'photo-1' }],
      },
      {
        id: 2,
        title: '로제 피자 2차',
        testRound: '2',
        parentId: 1,
        testContent: '치즈 유지',
        photos: [{ data: 'photo-2' }],
      },
    ];

    const plan = buildNoteUnmergePlan(notes, [1]);

    expect(plan.canUnmerge).toBe(true);
    expect(plan.unmergedCount).toBe(2);
    expect(plan.changes.map(change => change.patch)).toEqual([
      { parentId: null },
      { parentId: null },
    ]);
    expect(plan.changes[1].note.photos).toEqual([{ data: 'photo-2' }]);
    expect(plan.changes[1].note.testContent).toBe('치즈 유지');
  });

  test('연결되지 않은 독립 노트는 분리하지 않는다', () => {
    const plan = buildNoteUnmergePlan([{ id: 1, title: '단일 노트', parentId: null }], [1]);

    expect(plan.canUnmerge).toBe(false);
    expect(plan.reason).toContain('분리할 차수');
  });

  test('기준 제목에서 차수 표현을 제거한다', () => {
    expect(noteMergeBaseTitle({ title: '불고기 피자 - 2차' })).toBe('불고기 피자');
    expect(noteMergeBaseTitle({ title: '불고기 피자 테스트 3차' })).toBe('불고기 피자');
  });
});
