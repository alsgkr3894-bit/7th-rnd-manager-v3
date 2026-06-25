import {
  buildPreviousRoundDraft,
  clampNoteRating,
  formatNoteRating,
  formatTestRound,
  incrementTestRound,
} from '../../lib/note/evaluation.js';

describe('note evaluation helpers', () => {
  test('rating helpers clamp values and format stars', () => {
    expect(clampNoteRating(9)).toBe(5);
    expect(clampNoteRating(-1)).toBe(0);
    expect(clampNoteRating('3')).toBe(3);
    expect(formatNoteRating(4)).toBe('★★★★☆ (4/5)');
    expect(formatNoteRating(0)).toBe('');
  });

  test('test round increments the first numeric part', () => {
    expect(incrementTestRound('2')).toBe('3');
    expect(incrementTestRound('2차')).toBe('3차');
    expect(incrementTestRound('A-09')).toBe('A-10');
    expect(incrementTestRound('')).toBe('1');
    expect(formatTestRound('2')).toBe('2차');
    expect(formatTestRound('2차')).toBe('2차');
  });

  test('previous round draft only carries title and round linkage into a fresh note', () => {
    const draft = buildPreviousRoundDraft(
      {
        id: 7,
        title: '치즈 테스트',
        brand: 'main',
        category: '피자',
        noteType: '메뉴개발',
        testRound: '2차',
        testContent: '도우 변경',
        materials: '치즈 100g',
        tasteEval: '고소함',
        managerEval: '보류',
        costNote: '원가 상승',
        improvements: '염도 조정',
        issues: '수분 많음',
        nextAction: '재시식',
        reportSummary: '개선 필요',
        tags: '치즈, 재테스트',
        tempCostCalc: { rows: [{ name: '치즈' }] },
        tasteRating: 4,
        textureRating: 6,
        appearanceRating: '2',
        photos: [{ data: 'old-photo' }],
      },
      { testDate: '2026-06-24', status: '테스트', photos: [{ data: 'current-photo' }] }
    );

    expect(draft).toMatchObject({
      title: '치즈 테스트',
      menuName: '치즈 테스트',
      testRound: '3차',
      testDate: '2026-06-24',
      parentId: 7,
      status: '테스트',
      photos: [{ data: 'current-photo' }],
    });
    expect(draft.category).toBeUndefined();
    expect(draft.testContent).toBeUndefined();
    expect(draft.materials).toBeUndefined();
    expect(draft.tasteEval).toBeUndefined();
    expect(draft.tags).toBeUndefined();
    expect(draft.tempCostCalc).toBeUndefined();
    expect(draft.tasteRating).toBeUndefined();
  });
});
