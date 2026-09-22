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

  describe('저장된 순서 배열 밖 신규 메뉴 정렬 (2026-09-22 — 새 메뉴가 맨 밑에 붙던 버그)', () => {
    // "메뉴 출력 순서" 편집 당시 존재하던 메뉴 전체를 한 번에 저장한 스냅샷 — 카테고리별로
    // 이미 모여 있다(피자 2개 → 사이드 1개). 그 뒤 새로 추가된 피자 메뉴는 이 배열에 없다.
    const savedOrder = ['P-OR-001-L', 'P-OR-001-R', 'S-SD-001'];
    // 치즈를 기존 피자·기존 사이드·신규 피자가 모두 함께 쓰도록 해, 한 재료 행 안에서
    // sortMenuRefs가 실제로 신규 피자를 어디에 끼워 넣는지 직접 비교할 수 있게 한다.
    const sharedCheeseOrigins = [
      {
        ingredientName: '치즈',
        items: [{ displayName: '치즈', country: '미국산' }],
        menuCodes: [
          { menuCode: 'P-OR-001-L', menuName: '포크 피자 L', category: '피자/오리지널' },
          { menuCode: 'P-OR-001-R', menuName: '포크 피자 R', category: '피자/오리지널' },
          { menuCode: 'S-SD-001', menuName: '포크 사이드', category: '사이드' },
          { menuCode: 'P-OR-010-L', menuName: '새우 피자 L', category: '피자/오리지널' },
          { menuCode: 'P-OR-010-R', menuName: '새우 피자 R', category: '피자/오리지널' },
        ],
      },
    ];

    test('배달플랫폼용 표시판: 신규 피자 메뉴는 사이드 뒤(맨 끝)가 아니라 기존 피자 블록 바로 뒤에 들어간다', () => {
      const deliverySheet = buildOriginDeliverySheet(sharedCheeseOrigins, {}, savedOrder);
      const names = deliverySheet.map(row => row.menuName);

      expect(names).toEqual(['포크 피자', '새우 피자', '포크 사이드']);
    });

    test('매장용 표시판: 한 재료를 공유하는 메뉴 목록에서도 신규 피자가 기존 사이드보다 앞에 온다', () => {
      const storeSheet = buildOriginStoreSheet(sharedCheeseOrigins, savedOrder, {});

      expect(storeSheet[0].menus).toEqual(['포크 피자', '새우 피자', '포크 사이드']);
    });

    test('저장된 순서가 비어 있으면(한 번도 편집한 적 없음) 카테고리 순서로 정렬되고 같은 카테고리 안은 이름순이다', () => {
      const deliverySheet = buildOriginDeliverySheet(sharedCheeseOrigins, {}, []);
      // 두 피자 메뉴는 저장 순서가 없어 동률 → ㄱㄴㄷ('새우' < '포크')로, 사이드는 카테고리
      // 순위가 더 커 맨 뒤로.
      expect(deliverySheet.map(row => row.menuName)).toEqual([
        '새우 피자',
        '포크 피자',
        '포크 사이드',
      ]);
    });
  });
});
