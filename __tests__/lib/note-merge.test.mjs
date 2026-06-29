import { describe, expect, test } from '@jest/globals';

const { buildNoteMergePlan, noteMergeBaseTitle } = await import('../../lib/note/merge.js');

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
      { id: 3, note: notes[1], patch: { title: '트러플 피자', menuName: '트러플 피자', testRound: '1', parentId: null } },
      { id: 5, note: notes[2], patch: { title: '트러플 피자', menuName: '트러플 피자', testRound: '2', parentId: 3 } },
      { id: 7, note: notes[0], patch: { title: '트러플 피자', menuName: '트러플 피자', testRound: '3', parentId: 5 } },
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

  test('선택 노트가 2개 미만이면 병합하지 않는다', () => {
    const plan = buildNoteMergePlan([{ id: 1, title: '단일 노트' }], [1]);

    expect(plan.canMerge).toBe(false);
    expect(plan.reason).toContain('2개 이상');
  });

  test('기준 제목에서 차수 표현을 제거한다', () => {
    expect(noteMergeBaseTitle({ title: '불고기 피자 - 2차' })).toBe('불고기 피자');
    expect(noteMergeBaseTitle({ title: '불고기 피자 테스트 3차' })).toBe('불고기 피자');
  });
});
