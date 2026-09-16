import { describe, expect, test } from '@jest/globals';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';

describe('extractExcludedMenuSets guards', () => {
  test('원산지 제외 메뉴를 코드와 이름 기준으로 수집한다', () => {
    const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets([
      { menuCode: 'PZ1', menuName: ' 페퍼로니 ', excludeFromOrigin: true },
      { menuCode: 'PZ2', menuName: '치즈피자', excludeFromOrigin: false },
    ]);

    expect([...excludedMenuCodes]).toEqual(['PZ1']);
    expect([...excludedMenuNames]).toEqual(['페퍼로니']);
  });

  test('메뉴마스터에서 단종된 메뉴는 코드 기준으로 자동 제외한다', () => {
    const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets([
      { menuCode: 'P-1-L', menuName: '페스티벌 피자', status: 'discontinued' },
      { menuCode: 'P-1-R', menuName: '페스티벌 피자', status: 'discontinued' },
      { menuCode: 'P-2-L', menuName: '고르곤졸라 피자', status: 'active' },
    ]);
    expect([...excludedMenuCodes]).toEqual(['P-1-L', 'P-1-R']);
    // 그 이름을 쓰는 행이 전부 단종이면 이름으로도 제외
    expect([...excludedMenuNames]).toEqual(['페스티벌 피자']);
  });

  test('L은 판매 중인데 R만 단종이면 코드로만 제외하고 이름은 제외하지 않는다(판매 중인 L 보호)', () => {
    const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets([
      { menuCode: 'P-3-L', menuName: '고구마 피자', status: 'active' },
      { menuCode: 'P-3-R', menuName: '고구마 피자', status: 'discontinued' },
    ]);
    expect([...excludedMenuCodes]).toEqual(['P-3-R']);
    expect(excludedMenuNames.size).toBe(0);
  });

  test('표 출력 페이지는 단종(전 사이즈) 영양 메뉴를 영양성분표에서 제외한다', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const page = readFileSync(resolve('app/nutrition/export/NutritionLabelResult.jsx'), 'utf8');
    expect(page).toContain('buildDiscontinuedBaseCodeSet(masters)');
    expect(page).toContain('m => !isNutritionMenuDiscontinued(m.menuCode, discontinuedBaseCodes)');
    expect(page).toContain('sortNutritionLabelMenus(activeMenuRefs, masterByCode, menuOrder)');
  });

  test('배열이 아닌 입력과 잘못된 항목은 빈 Set으로 안전하게 처리한다', () => {
    const empty = extractExcludedMenuSets(null);
    expect(empty.excludedMenuCodes.size).toBe(0);
    expect(empty.excludedMenuNames.size).toBe(0);

    const mixed = extractExcludedMenuSets([
      null,
      'bad',
      { menuCode: null, menuName: { ko: '표시불가' }, excludeFromOrigin: true },
    ]);
    expect(mixed.excludedMenuCodes.size).toBe(0);
    expect(mixed.excludedMenuNames.size).toBe(0);
  });
});
