import { describe, expect, test } from '@jest/globals';
import { dropDiscontinuedToppings, extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';

const masters = [
  { menuCode: 'T-OLD', menuName: '단종 토핑', category: '추가토핑', status: 'discontinued' },
  { menuCode: 'T-NEW', menuName: '판매 토핑', category: '추가토핑' },
  { menuCode: 'T-HIDE', menuName: '제외 토핑', category: '추가토핑', excludeFromOrigin: true },
  { menuCode: 'S-1', menuName: '치즈', category: '사이드', status: 'discontinued' },
];
const toppings = [
  // 직접 연결 코드, 토핑 코드, 이름 순으로 메뉴를 찾는다.
  { toppingCode: 'A', menuCode: 'T-OLD', toppingName: '이름 다름', productCode: 'I' },
  { toppingCode: 'T-NEW', toppingName: '판매 토핑', productCode: 'I' },
  { toppingCode: 'B', toppingName: '단종 토핑', productCode: 'I' },
  { toppingCode: 'C', toppingName: '제외 토핑', productCode: 'I' },
  { toppingCode: 'D', toppingName: '치즈', productCode: 'I' },
];

describe('단종 추가토핑 출력 제외', () => {
  test('영양성분표는 연결된 메뉴가 전부 단종인 토핑만 뺀다', () => {
    expect(dropDiscontinuedToppings(toppings, masters).map(t => t.toppingCode)).toEqual([
      'T-NEW',
      'C',
      'D', // 추가토핑이 아닌 동명 메뉴는 연결로 보지 않는다.
    ]);
  });

  test('알레르기 표는 단종·출력 제외 메뉴의 토핑 행을 만들지 않는다', () => {
    const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(masters);
    const rows = buildMenuMatrix(
      [{ productCode: 'I', ingredientName: '재료', allergens: ['AL02'] }],
      { ingredientToMenus: new Map() },
      [],
      (code, name) => excludedMenuCodes.has(code) || excludedMenuNames.has(name),
      [],
      {},
      toppings,
      masters
    );
    const toppingRows = rows.filter(row => row.kind === 'topping').map(row => row.toppingCode);

    expect(toppingRows).not.toContain('A');
    expect(toppingRows).not.toContain('B');
    expect(toppingRows).not.toContain('C');
    expect(toppingRows).toContain('D');
    expect(toppingRows).toContain('T-NEW');
  });
});
