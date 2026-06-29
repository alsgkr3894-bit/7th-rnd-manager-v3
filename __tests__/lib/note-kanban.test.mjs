import { describe, expect, test } from '@jest/globals';

const { buildKanbanBoardCards } = await import('../../lib/note/kanban.js');

describe('note kanban board cards', () => {
  test('같은 차수 묶음은 최신 대표 카드 1개로 표시한다', () => {
    const cards = buildKanbanBoardCards([
      {
        id: 1,
        title: '트러플 피자',
        testRound: '1',
        status: '테스트',
        testDate: '2026-01-01',
      },
      {
        id: 2,
        title: '트러플 피자',
        testRound: '2',
        parentId: 1,
        status: '재테스트',
        testDate: '2026-01-02',
      },
      {
        id: 3,
        title: '트러플 피자',
        testRound: '3',
        parentId: 2,
        status: '출시예정',
        testDate: '2026-01-03',
      },
    ]);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 3,
      status: '출시예정',
      _kanbanGroupCount: 3,
      _kanbanGroupIds: [1, 2, 3],
    });
  });

  test('검색은 숨겨진 이전 차수 내용도 대상으로 삼고 대표 카드를 반환한다', () => {
    const cards = buildKanbanBoardCards(
      [
        {
          id: 1,
          title: '랜치 소스',
          testRound: '1',
          testContent: '마늘향 강함',
          testDate: '2026-02-01',
        },
        {
          id: 2,
          title: '랜치 소스',
          testRound: '2',
          parentId: 1,
          testContent: '산미 조절',
          testDate: '2026-02-02',
        },
      ],
      '마늘향'
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(2);
    expect(cards[0]._kanbanGroupCount).toBe(2);
  });

  test('연결되지 않아도 제목 차수 표현이 같으면 대표 카드로 묶는다', () => {
    const cards = buildKanbanBoardCards([
      { id: 'a', title: '불고기 피자 1차', testDate: '2026-03-01' },
      { id: 'b', title: '불고기 피자 2차', testDate: '2026-03-02' },
      { id: 'c', title: '새우 피자', testDate: '2026-03-03' },
    ]);

    expect(cards.map(card => card.id)).toEqual(['b', 'c']);
    expect(cards.find(card => card.id === 'b')._kanbanGroupCount).toBe(2);
  });
});
