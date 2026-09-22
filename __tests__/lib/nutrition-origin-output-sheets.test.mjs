import {
  buildOriginDeliverySheet,
  buildOriginFridgeSheet,
  buildOriginStatementSheet,
  buildOriginStoreSheet,
  buildPizzaCommonSpans,
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
      originCountry: '(돼지고기:국내산)',
      menus: ['포크', '포크 사이드'],
      pizzaCommon: false,
    });
    expect(storeSheet[1]).toMatchObject({
      displayName: '치즈(치즈)',
      originCountry: '(치즈:미국산/치즈:뉴질랜드산)',
    });
    expect(fridgeSheet[0]).toMatchObject({
      ingredientName: '양념 돼지고기',
      itemText: '돼지고기',
      originText: '(돼지고기:국내산)',
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
      // 치즈가 "모든 피자"에 들어가면 매장비치용은 목록 대신 "피자공통"으로 적으므로, 치즈에
      // 없는 피자를 하나 더 둬 정렬 자체를 확인할 수 있게 한다.
      {
        ingredientName: '불고기',
        items: [{ displayName: '돼지고기', country: '국내산' }],
        menuCodes: [
          { menuCode: 'P-OR-020-L', menuName: '불고기 피자 L', category: '피자/오리지널' },
        ],
      },
    ];

    test('배달플랫폼용 표시판: 신규 피자 메뉴는 사이드 뒤(맨 끝)가 아니라 기존 피자 블록 바로 뒤에 들어간다', () => {
      const deliverySheet = buildOriginDeliverySheet(sharedCheeseOrigins, {}, savedOrder);
      const names = deliverySheet.map(row => row.menuName);

      expect(names).toEqual(['포크 피자', '불고기 피자', '새우 피자', '포크 사이드']);
    });

    test('매장용 표시판: 한 재료를 공유하는 메뉴 목록에서도 신규 피자가 기존 사이드보다 앞에 온다', () => {
      const storeSheet = buildOriginStoreSheet(sharedCheeseOrigins, savedOrder, {});
      const cheese = storeSheet.find(row => row.displayName === '치즈(치즈)');

      expect(cheese.menus).toEqual(['포크', '새우', '포크 사이드']);
    });

    test('저장된 순서가 비어 있으면(한 번도 편집한 적 없음) 카테고리 순서로 정렬되고 같은 카테고리 안은 이름순이다', () => {
      const deliverySheet = buildOriginDeliverySheet(sharedCheeseOrigins, {}, []);
      // 두 피자 메뉴는 저장 순서가 없어 동률 → ㄱㄴㄷ('새우' < '포크')로, 사이드는 카테고리
      // 순위가 더 커 맨 뒤로.
      expect(deliverySheet.map(row => row.menuName)).toEqual([
        '불고기 피자',
        '새우 피자',
        '포크 피자',
        '포크 사이드',
      ]);
    });
  });

  describe('냉장고부착용 양식 (2026-09-22 — 냉장고원산지.xlsx)', () => {
    test('표시품목과 원산지가 완전히 같은 재료는 한 행으로 합치고 원산지는 괄호 표기', () => {
      const sheet = buildOriginFridgeSheet(
        [
          {
            ingredientName: '미트소스',
            items: [
              { displayName: '돼지고기', country: '국내산' },
              { displayName: '쇠고기', country: '호주산' },
            ],
          },
          {
            ingredientName: '페페로니',
            items: [
              { displayName: '돼지고기', country: '국내산' },
              { displayName: '쇠고기', country: '호주산' },
            ],
          },
          { ingredientName: '양념포크', items: [{ displayName: '돼지고기', country: '국내산' }] },
          {
            ingredientName: '세블락소시지',
            items: [{ displayName: '돼지고기', country: '국내산' }],
          },
          { ingredientName: '베이컨', items: [{ displayName: '돼지고기', country: '미국산' }] },
          {
            ingredientName: '스테이크',
            items: [{ displayName: '쇠고기', country: '호주산,뉴질랜드산' }],
          },
        ],
        {}
      );
      expect(sheet.map(r => [r.ingredientName, r.itemText, r.originText])).toEqual([
        ['베이컨', '돼지고기', '(돼지고기:미국산)'],
        ['양념포크, 세블락소시지', '돼지고기', '(돼지고기:국내산)'],
        ['미트소스, 페페로니', '돼지고기, 쇠고기', '(돼지고기:국내산/쇠고기:호주산)'],
        ['스테이크', '쇠고기', '(쇠고기:호주산,뉴질랜드산 섞음)'],
      ]);
    });
  });

  describe('매장비치용 양식 (2026-09-22 — 원산지 매장비치용.xlsx)', () => {
    const pizza = (code, name, size) => ({
      menuCode: `${code}-${size}`,
      menuName: `${name} ${size}`,
      category: '피자',
    });
    const allPizzas = [
      pizza('P-OR-001', '포크 피자', 'L'),
      pizza('P-OR-001', '포크 피자', 'R'),
      pizza('P-OR-002', '새우 피자', 'L'),
      pizza('P-OR-002', '새우 피자', 'R'),
    ];
    const sampleOrigins = [
      {
        ingredientName: '까망베르',
        items: [{ displayName: '치즈', country: '덴마크산' }],
        menuCodes: allPizzas,
      },
      {
        ingredientName: '모짜렐라',
        items: [{ displayName: '치즈', country: '덴마크산,미국산' }],
        menuCodes: allPizzas,
      },
      {
        ingredientName: '도우',
        items: [
          { displayName: '밀', country: '미국산,캐나다산' },
          { displayName: '흑미', country: '국내산' },
        ],
        menuCodes: allPizzas,
      },
      {
        ingredientName: '페페로니',
        items: [
          { displayName: '돼지고기', country: '국내산' },
          { displayName: '쇠고기', country: '호주산' },
        ],
        menuCodes: [pizza('P-OR-001', '포크 피자', 'L'), pizza('P-OR-001', '포크 피자', 'R')],
      },
      {
        ingredientName: '베이컨',
        items: [{ displayName: '돼지고기', country: '미국산' }],
        menuCodes: [
          pizza('P-OR-002', '새우 피자', 'L'),
          { menuCode: 'S-PS-001', menuName: '오븐 스파게티', category: '사이드' },
        ],
      },
    ];

    test('재료당 1행 — 표시품목(재료명) / (표시품목:원산지/…) / 피자 단어를 뺀 메뉴명', () => {
      const sheet = buildOriginStoreSheet(sampleOrigins, [], {});
      expect(sheet.find(r => r.displayName === '돼지고기, 쇠고기(페페로니)')).toMatchObject({
        originCountry: '(돼지고기:국내산/쇠고기:호주산)',
        menus: ['포크'],
        pizzaCommon: false,
      });
      expect(sheet.find(r => r.displayName === '돼지고기(베이컨)')).toMatchObject({
        originCountry: '(돼지고기:미국산)',
        menus: ['새우', '오븐 스파게티'],
      });
    });

    test('모든 피자에 들어가는 재료는 "피자공통"으로 적고 맨 앞에 온다', () => {
      const sheet = buildOriginStoreSheet(sampleOrigins, [], {});
      expect(sheet.slice(0, 2).every(r => r.pizzaCommon)).toBe(true);
      expect(sheet.find(r => r.displayName === '밀, 흑미(도우)')).toMatchObject({
        originCountry: '(밀:미국산,캐나다산 섞음/흑미:국내산)',
        menus: ['피자공통'],
        pizzaCommon: true,
      });
    });

    test('표시품목이 하나이고 메뉴 목록이 같은 재료들은 한 행으로 합친다(치즈)', () => {
      const sheet = buildOriginStoreSheet(sampleOrigins, [], {});
      expect(sheet.find(r => r.displayName === '치즈(까망베르, 모짜렐라)')).toMatchObject({
        originCountry: '(까망베르:덴마크산/모짜렐라:덴마크산,미국산 섞음)',
        menus: ['피자공통'],
      });
      expect(sheet.some(r => r.displayName === '치즈(까망베르)')).toBe(false);
    });

    test('연속된 피자공통 행은 메뉴명 칸을 합칠 구간으로 잡는다', () => {
      const sheet = buildOriginStoreSheet(sampleOrigins, [], {});
      expect(buildPizzaCommonSpans(sheet)).toEqual([{ start: 0, length: 2 }]);
      expect(
        buildPizzaCommonSpans([
          { pizzaCommon: true, menus: ['피자공통'] },
          { pizzaCommon: true, menus: ['피자공통', '오븐 스파게티'] },
          { pizzaCommon: false, menus: ['포크'] },
        ])
      ).toEqual([]);
    });

    test('어느 메뉴에도 안 쓰이는 재료들은 표시품목이 같아도 합치지 않는다', () => {
      const sheet = buildOriginStoreSheet(
        [
          { ingredientName: '스모크햄', items: [{ displayName: '돼지고기', country: '국내산' }] },
          {
            ingredientName: '고추장불고기',
            items: [{ displayName: '돼지고기', country: '외국산' }],
          },
        ],
        [],
        {}
      );
      expect(sheet.map(r => r.displayName)).toEqual([
        '돼지고기(고추장불고기)',
        '돼지고기(스모크햄)',
      ]);
    });

    test('하프앤하프는 피자처럼 "피자" 단어를 빼고, 피자공통 뒤에 따로 나열하지 않는다', () => {
      const half = {
        menuCode: 'P-HH-001-L',
        menuName: '하프앤하프 피자 L',
        category: '피자/하프앤하프',
      };
      const withHalf = sampleOrigins.map(row => ({ ...row, menuCodes: [...row.menuCodes, half] }));
      const sheet = buildOriginStoreSheet(withHalf, [], {});
      expect(sheet.find(r => r.displayName === '밀, 흑미(도우)').menus).toEqual(['피자공통']);
      // 순서는 기존 규칙 그대로(하프앤하프는 저장된 메뉴 순서가 없으면 사이드 뒤)
      expect(sheet.find(r => r.displayName === '돼지고기(베이컨)').menus).toEqual([
        '새우',
        '오븐 스파게티',
        '하프앤하프',
      ]);
    });

    test('피자가 한 종류뿐이면 피자공통으로 뭉개지 않는다', () => {
      const onePizza = sampleOrigins.map(row => ({
        ...row,
        menuCodes: row.menuCodes.filter(m => !m.menuCode.startsWith('P-OR-002')),
      }));
      const sheet = buildOriginStoreSheet(onePizza, [], {});
      expect(sheet.every(r => !r.pizzaCommon)).toBe(true);
    });
  });
});
