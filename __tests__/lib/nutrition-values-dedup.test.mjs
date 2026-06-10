import {
  buildNutritionBaseDuplicateDiagnostics,
  buildRawValueMapFromRows,
} from '../../lib/nutrition/values/store.js';

describe('nutrition values duplicate guards', () => {
  test('buildRawValueMapFromRows는 menuCode+crustType 중복 중 최신 수정값을 선택한다', () => {
    const map = buildRawValueMapFromRows([
      {
        id: 1,
        menuCode: 'PZ-001',
        menuName: '피자',
        crustType: '석쇠L',
        kcal: 100,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        menuCode: 'PZ-001',
        menuName: '피자',
        crustType: '석쇠L',
        kcal: 200,
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 3,
        menuCode: 'PZ-001',
        menuName: '피자',
        crustType: '석쇠R',
        kcal: 150,
      },
    ]);

    expect(map['PZ-001__석쇠L']).toMatchObject({ id: 2, kcal: 200 });
    expect(map['PZ-001__석쇠R']).toMatchObject({ id: 3, kcal: 150 });
  });

  test('updatedAt이 같거나 없으면 더 큰 id를 최신 대표값으로 선택한다', () => {
    const map = buildRawValueMapFromRows([
      { id: 4, menuCode: 'PZ-002', crustType: '석쇠L', kcal: 300 },
      { id: 5, menuCode: 'PZ-002', crustType: '석쇠L', kcal: 350 },
    ]);

    expect(map['PZ-002__석쇠L']).toMatchObject({ id: 5, kcal: 350 });
  });

  test('buildNutritionBaseDuplicateDiagnostics는 메뉴와 원시값 중복을 분리 집계한다', () => {
    const diagnostics = buildNutritionBaseDuplicateDiagnostics({
      menuRefs: [
        { id: 1, menuCode: 'PZ-001', menuName: '피자 A' },
        { id: 2, menuCode: 'PZ-001', menuName: '피자 A 수정' },
        { id: 3, menuCode: 'PZ-002', menuName: '피자 B' },
      ],
      rawValues: [
        { id: 10, menuCode: 'PZ-001', crustType: '석쇠L', kcal: 100 },
        { id: 11, menuCode: 'PZ-001', crustType: '석쇠L', kcal: 120 },
        { id: 12, menuCode: 'PZ-001', crustType: '석쇠R', kcal: 90 },
      ],
    });

    expect(diagnostics).toMatchObject({
      hasDuplicates: true,
      menuGroupCount: 1,
      rawGroupCount: 1,
      duplicateMenuRows: 1,
      duplicateRawRows: 1,
      duplicateRows: 2,
    });
    expect(diagnostics.menuGroups[0]).toMatchObject({
      key: 'PZ-001',
      count: 2,
      keepId: 2,
      removeIds: [1],
    });
    expect(diagnostics.rawGroups[0]).toMatchObject({
      key: 'PZ-001__석쇠L',
      count: 2,
      keepId: 11,
      removeIds: [10],
    });
  });
});
