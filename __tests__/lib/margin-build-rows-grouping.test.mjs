import { buildDetailRows } from '../../lib/cost/margin/build-rows.js';

const emptyMaps = {
  pizzaMap: new Map(),
  personalMap: new Map(),
  sideMap: new Map(),
  setMap: new Map(),
};

describe('buildDetailRows 그룹핑 (H-2 회귀)', () => {
  test('동명·동카테고리라도 menuCode가 다른 비-L/R 메뉴는 별도 행으로 유지된다', () => {
    const rows = buildDetailRows(
      [
        { menuCode: 'DRINK-001', menuName: '콜라', category: '음료', size: '', price: 2000 },
        { menuCode: 'DRINK-002', menuName: '콜라', category: '음료', size: '', price: 2500 },
      ],
      emptyMaps
    );

    // 병합되지 않고 2행으로 분리
    expect(rows).toHaveLength(2);
    const codes = rows.map(r => r.menuCode).sort();
    expect(codes).toEqual(['DRINK-001', 'DRINK-002']);
    // 각 행의 판매가가 서로 덮어쓰이지 않고 보존
    const priceByCode = Object.fromEntries(rows.map(r => [r.menuCode, r.sizes[0].sellingPrice]));
    expect(priceByCode['DRINK-001']).toBe(2000);
    expect(priceByCode['DRINK-002']).toBe(2500);
  });

  test('정상 L/R 쌍은 여전히 menuCode base 기준 한 행으로 그룹핑된다', () => {
    const rows = buildDetailRows(
      [
        { menuCode: 'PZ-001-L', menuName: '페퍼로니 L', category: '피자', size: 'L', price: 20000 },
        { menuCode: 'PZ-001-R', menuName: '페퍼로니 R', category: '피자', size: 'R', price: 17000 },
      ],
      emptyMaps
    );

    expect(rows).toHaveLength(1);
    const labels = rows[0].sizes.map(s => s.label).sort();
    expect(labels).toEqual(['L', 'R']);
    expect(rows[0].menuCodes.sort()).toEqual(['PZ-001-L', 'PZ-001-R']);
  });

  test('추가토핑(T-ETC-*)은 toppingMap 레시피로 원가가 계산되고 누락되지 않는다', () => {
    // 회귀: DETAIL_STORE_MAP에 '추가토핑' 매핑이 빠져 있어 toppingMap을 넘겨도
    // 조용히 continue되며 마진표에서 추가토핑 메뉴 전체가 통째로 사라지던 버그.
    const toppingMap = new Map([
      ['T-ETC-002', { menuCode: 'T-ETC-002', components: [{ productCode: 'CHZ', quantity: 80 }] }],
    ]);
    const unitPriceMap = new Map([['CHZ', { unitPrice: 10 }]]);

    const rows = buildDetailRows(
      [
        {
          menuCode: 'T-ETC-002',
          menuName: '치즈 80g',
          category: '추가토핑',
          size: '단일',
          price: 500,
        },
      ],
      { ...emptyMaps, toppingMap },
      unitPriceMap
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ menuCode: 'T-ETC-002', menuCategory: '추가토핑' });
    expect(rows[0].costMap['단일']).toBe(800); // 80 * 10
  });

  test('피자 중분류는 판매가 분류보다 메뉴코드 값을 우선한다', () => {
    const rows = buildDetailRows(
      [
        { menuCode: 'P-PS-001-L', menuName: '스페셜 L', category: '피자', size: 'L', price: 32000 },
        { menuCode: 'P-PS-001-R', menuName: '스페셜 R', category: '피자', size: 'R', price: 25000 },
      ],
      emptyMaps
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      menuCategory: '피자/프리미엄 스페셜',
      menuSubCategory: '프리미엄 스페셜',
      menuSubCategoryCode: 'PS',
    });
  });
});
