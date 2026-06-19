import {
  buildOriginDeliverySheet,
  buildOriginFridgeSheet,
  buildOriginStatementSheet,
  buildOriginStoreSheet,
  formatOriginCountries,
  normalizeOriginItems,
} from '@/lib/nutrition/origin/output-sheets';

const origins = [
  {
    ingredientName: '양념포크',
    items: [
      { displayName: '돼지고기', country: '국내산' },
      { displayName: '돼지고기', country: '국내산' },
    ],
    menuCodes: [
      { menuCode: 'P-OR-001-L', menuName: '포크 피자 L', category: '피자/오리지널' },
      { menuCode: 'P-OR-001-R', menuName: '포크 피자 R', category: '피자/오리지널' },
      { menuCode: 'S-SD-001', menuName: '포크 사이드', category: '사이드' },
    ],
  },
  {
    ingredientName: '치즈',
    items: [
      { displayName: '치즈', country: '미국산' },
      { displayName: '치즈', country: '뉴질랜드산' },
    ],
    menuCodes: [
      { menuCode: 'P-OR-001-L', menuName: '포크 피자 L', category: '피자/오리지널' },
      { menuCode: 'P-OR-001-R', menuName: '포크 피자 R', category: '피자/오리지널' },
    ],
  },
];

describe('nutrition origin output sheets', () => {
  test('normalizes duplicate display/country origin items', () => {
    expect(
      normalizeOriginItems([
        { displayName: '돼지고기', country: '국내산' },
        { displayName: '돼지고기', country: '국내산' },
        { displayName: '돼지고기', country: '' },
      ])
    ).toEqual([{ displayName: '돼지고기', country: '국내산' }]);
  });

  test('formats multiple origin countries with display item labels', () => {
    expect(
      formatOriginCountries([
        { displayName: '치즈', country: '미국산' },
        { displayName: '치즈', country: '뉴질랜드산' },
      ])
    ).toBe('치즈:미국산, 치즈:뉴질랜드산');
  });

  test('builds store, fridge, delivery, and statement origin sheets', () => {
    const overrides = { 양념포크: '양념 돼지고기' };
    const storeSheet = buildOriginStoreSheet(origins, ['P-OR-001-L', 'S-SD-001'], overrides);
    const fridgeSheet = buildOriginFridgeSheet(origins, overrides);
    const deliverySheet = buildOriginDeliverySheet(origins, overrides, ['P-OR-001-L', 'S-SD-001']);
    const statementSheet = buildOriginStatementSheet(origins, overrides);

    expect(storeSheet[0]).toMatchObject({
      displayName: '돼지고기(양념 돼지고기)',
      originCountry: '돼지고기(국내산)',
      menus: ['포크 피자', '포크 사이드'],
    });
    expect(fridgeSheet[0]).toMatchObject({
      ingredientName: '양념 돼지고기',
      itemText: '돼지고기',
      originText: '국내산',
    });
    expect(deliverySheet[0]).toMatchObject({
      menuCode: 'P-OR-001',
      menuName: '포크 피자',
      parts: ['양념 돼지고기(국내산)', '치즈(치즈:미국산, 치즈:뉴질랜드산)'],
    });
    expect(statementSheet).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          names: '양념 돼지고기',
          breakdown: '돼지고기 : 국내산',
        }),
        expect.objectContaining({
          names: '치즈',
          breakdown: '치즈 : 미국산, 뉴질랜드산 섞음',
        }),
      ])
    );
  });
});
