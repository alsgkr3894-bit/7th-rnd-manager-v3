import {
  buildNextSampleRoundDraft,
  sampleChainTitle,
  sampleRoundLabel,
} from '../../lib/sample/rounds.js';

describe('sample round helpers', () => {
  test('sample round draft carries title, ingredient grouping, next round, and linkage from source', () => {
    const draft = buildNextSampleRoundDraft(
      {
        id: 12,
        brand: 'main',
        title: '치즈 샘플',
        sampleNames: ['치즈'],
        category: '토핑식자재',
        testRound: '2차',
        company: 'A사',
        description: '짠맛',
        result: '보류',
        photos: [{ data: 'old-photo' }],
      },
      {
        testDate: '2026-06-25',
        sampleNames: [''],
        photos: [],
      }
    );

    expect(draft).toMatchObject({
      brand: 'main',
      title: '치즈 샘플',
      ingredientGroupName: '치즈',
      testRound: '3차',
      parentId: 12,
      testDate: '2026-06-25',
      sampleNames: [''],
      photos: [],
    });
    expect(draft.category).toBeUndefined();
    expect(draft.company).toBeUndefined();
    expect(draft.description).toBeUndefined();
    expect(draft.result).toBeUndefined();
  });

  test('sample title and round labels fall back safely', () => {
    expect(sampleChainTitle({ sampleNames: [' 도우 '] })).toBe('도우');
    expect(sampleRoundLabel({ testRound: '4' })).toBe('4차');
  });
});
