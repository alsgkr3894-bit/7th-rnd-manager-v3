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
