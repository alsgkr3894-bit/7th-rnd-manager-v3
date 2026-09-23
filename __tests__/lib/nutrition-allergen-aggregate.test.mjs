import { describe, expect, test } from '@jest/globals';
import {
  allergenNames,
  buildEdgeAllergenMap,
  buildMenuAllergenMap,
  buildToppingAllergenMap,
} from '@/lib/nutrition/allergen/aggregate';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';

/**
 * B1 회귀 방지: 출력 영양성분표의 메뉴별 알레르기 집계.
 * 엣지/도우 식자재가 ingredientToMenus를 통해 피자에 연결되면(엣지 확장은
 * ingredient-menu-map 테스트가 커버) 그 알레르겐이 메뉴 합집합에 포함돼야 한다.
 */
describe('buildMenuAllergenMap', () => {
  const ingredients = [
    { productCode: 'DGH', ingredientName: '도우', allergens: ['AL01'], category: '도우' }, // 도우(엣지) 유래
    { productCode: 'CHZ', ingredientName: '치즈', allergens: ['AL02'] }, // 레시피 재료
    { productCode: 'OLD', ingredientName: '단종재료', allergens: ['AL04'], discontinued: true }, // 제외돼야 함
    { productCode: 'EXC', ingredientName: '제외재료', allergens: ['AL05'], excluded: true }, // 제외돼야 함
  ];

  // ingredientToMenus: Map<key, Map<menuCode, meta>> — 도우/치즈/단종 모두 PZ1에 연결
  const ingredientToMenus = new Map([
    ['code:DGH', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
    ['code:CHZ', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
    ['code:OLD', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
    ['code:EXC', new Map([['PZ1', { menuName: '페퍼로니', category: '피자' }]])],
  ]);

  test('피자 메뉴 알레르겐 = 도우(엣지)+레시피 재료 합집합, 단종/제외는 제외', () => {
    const map = buildMenuAllergenMap({ ingredients, ingredientToMenus });
    const codes = map.get('PZ1');
    expect(codes).toBeInstanceOf(Set);
    expect([...codes].sort()).toEqual(['AL01', 'AL02']); // 도우(AL01)+치즈(AL02), 단종/제외 빠짐
  });

  test('name: 키 폴백으로도 매칭된다', () => {
    const i2m = new Map([
      ['name:치즈', new Map([['PZ2', { menuName: '치즈피자', category: '피자' }]])],
    ]);
    const map = buildMenuAllergenMap({ ingredients, ingredientToMenus: i2m });
    expect([...(map.get('PZ2') || [])]).toEqual(['AL02']);
  });

  test('1인피자는 씬바샤삭 크러스트 행 1개만 생성된다 (B-9)', () => {
    const ingredientRows = [
      { productCode: 'CHZ', ingredientName: '치즈', allergens: ['AL02'] },
      { productCode: 'DGH', ingredientName: '도우', allergens: ['AL01'], category: '도우' },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [{ menuCode: 'IP-001', menuName: '1인 페퍼로니', category: '1인피자' }],
      detailRecipes: [
        {
          menuCode: 'IP-001',
          menuName: '1인 페퍼로니',
          category: '1인피자',
          components: [
            { productCode: 'CHZ', ingredientName: '치즈' },
            { productCode: 'DGH', ingredientName: '도우' },
          ],
        },
      ],
    });

    const matrixRows = buildMenuMatrix(ingredientRows, mapData, [], () => false, [], {}, []);
    expect(matrixRows).toHaveLength(1);
    expect(matrixRows[0].crust).toBe('씬바샤삭');
    // 도우 계열은 씬바샤삭에서 제외돼야 함
    expect([...matrixRows[0].allergenCodes]).not.toContain('AL01');
    expect([...matrixRows[0].allergenCodes]).toContain('AL02');
  });

  test('1인피자 L/R 사이즈는 논리 키로 묶인다 (B-9)', () => {
    const ingredientRows = [{ productCode: 'CHZ', ingredientName: '치즈', allergens: ['AL02'] }];
    const mapData = buildIngredientMenuMap({
      menuMasters: [
        { menuCode: 'IP-001-L', menuName: '1인 페퍼로니 L', category: '1인피자' },
        { menuCode: 'IP-001-R', menuName: '1인 페퍼로니 R', category: '1인피자' },
      ],
      detailRecipes: [
        {
          menuCode: 'IP-001-L',
          menuName: '1인 페퍼로니 L',
          category: '1인피자',
          components: [{ productCode: 'CHZ', ingredientName: '치즈' }],
        },
      ],
    });

    const matrixRows = buildMenuMatrix(ingredientRows, mapData, [], () => false, [], {}, []);
    // L/R이 논리 키(IP-001)로 묶여 씬바샤삭 1행만 생성
    expect(matrixRows).toHaveLength(1);
    expect(matrixRows[0].crust).toBe('씬바샤삭');
  });

  test('알레르기 매칭이 없어도 메뉴마스터 전체 메뉴를 매트릭스에 표시한다', () => {
    const matrixRows = buildMenuMatrix(
      [],
      buildIngredientMenuMap({
        menuMasters: [
          { menuCode: 'P-PS-001-L', menuName: '샘스테이크 피자 L', category: '피자', size: 'L' },
          { menuCode: 'P-PS-001-R', menuName: '샘스테이크 피자 R', category: '피자', size: 'R' },
          { menuCode: 'S-CHK-001', menuName: '치킨텐더', category: '사이드' },
        ],
        detailRecipes: [],
      }),
      [],
      () => false,
      [],
      {},
      [],
      [
        { menuCode: 'P-PS-001-L', menuName: '샘스테이크 피자 L', category: '피자', size: 'L' },
        { menuCode: 'P-PS-001-R', menuName: '샘스테이크 피자 R', category: '피자', size: 'R' },
        { menuCode: 'S-CHK-001', menuName: '치킨텐더', category: '사이드' },
      ]
    );

    const pizzaRows = matrixRows.filter(row => row.menuCode === 'P-PS-001');
    expect(pizzaRows).toHaveLength(4);
    expect(pizzaRows[0].sourceMenuCodes.sort()).toEqual(['P-PS-001-L', 'P-PS-001-R']);
    expect(pizzaRows.find(row => row.crust === '석쇠').allergenCodes.size).toBe(0);
    expect([...(pizzaRows.find(row => row.crust === '치즈크러스트').allergenCodes || [])]).toEqual([
      'AL02',
    ]);
    expect(matrixRows.find(row => row.menuCode === 'S-CHK-001')).toMatchObject({
      menuName: '치킨텐더',
      category: '사이드',
    });
  });

  test('원가레시피 productCode가 달라도 식자재명으로 알레르기 정보까지 집계된다', () => {
    const ingredientRows = [
      { productCode: 'REAL-CHZ', ingredientName: '체다 치즈', allergens: ['AL02'] },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [{ menuCode: 'S-CHZ-001', menuName: '치즈볼', category: '사이드' }],
      detailRecipes: [
        {
          menuCode: 'S-CHZ-001',
          menuName: '치즈볼',
          category: '사이드',
          components: [{ productCode: 'OLD-CHZ', ingredientName: '체다치즈' }],
        },
      ],
    });

    const allergenMap = buildMenuAllergenMap({
      ingredients: ingredientRows,
      ingredientToMenus: mapData.ingredientToMenus,
    });
    expect([...(allergenMap.get('S-CHZ-001') || [])]).toEqual(['AL02']);

    const matrixRows = buildMenuMatrix(ingredientRows, mapData, [], () => false, [], {}, []);
    expect(matrixRows).toHaveLength(1);
    expect([...matrixRows[0].allergenCodes]).toEqual(['AL02']);
  });

  test('식자재명이 비어 있어도 표시명으로 레시피 알레르기를 집계한다', () => {
    const ingredientRows = [
      {
        productCode: 'REAL-SAUCE',
        ingredientName: '',
        displayName: '토마토 소스',
        productName: '토마토소스 2kg',
        allergens: ['AL05'],
      },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [{ menuCode: 'S-SAUCE-001', menuName: '소스 테스트', category: '사이드' }],
      detailRecipes: [
        {
          menuCode: 'S-SAUCE-001',
          menuName: '소스 테스트',
          category: '사이드',
          components: [{ productCode: 'OLD-SAUCE', ingredientName: '토마토소스' }],
        },
      ],
    });

    const allergenMap = buildMenuAllergenMap({
      ingredients: ingredientRows,
      ingredientToMenus: mapData.ingredientToMenus,
    });
    expect([...(allergenMap.get('S-SAUCE-001') || [])]).toEqual(['AL05']);

    const matrixRows = buildMenuMatrix(ingredientRows, mapData, [], () => false, [], {}, []);
    expect(matrixRows).toHaveLength(1);
    expect([...matrixRows[0].allergenCodes]).toEqual(['AL05']);
  });

  test('L/R 레시피 알레르기는 영양성분 base menuCode에도 합쳐진다', () => {
    const ingredientRows = [
      { productCode: 'CHZ-L', ingredientName: 'L 치즈', allergens: ['AL02'] },
      { productCode: 'WHT-R', ingredientName: 'R 도우', allergens: ['AL06'] },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [
        { menuCode: 'P-PS-001-L', menuName: '샘스테이크 피자 L', category: '피자', size: 'L' },
        { menuCode: 'P-PS-001-R', menuName: '샘스테이크 피자 R', category: '피자', size: 'R' },
      ],
      detailRecipes: [
        {
          menuCode: 'P-PS-001-L',
          menuName: '샘스테이크 피자 L',
          category: '피자',
          size: 'L',
          components: [{ productCode: 'CHZ-L', ingredientName: 'L 치즈' }],
        },
        {
          menuCode: 'P-PS-001-R',
          menuName: '샘스테이크 피자 R',
          category: '피자',
          size: 'R',
          components: [{ productCode: 'WHT-R', ingredientName: 'R 도우' }],
        },
      ],
    });

    const allergenMap = buildMenuAllergenMap({
      ingredients: ingredientRows,
      ingredientToMenus: mapData.ingredientToMenus,
    });

    expect([...(allergenMap.get('P-PS-001') || [])].sort()).toEqual(['AL02', 'AL06']);
    expect([...(allergenMap.get('P-PS-001-L') || [])]).toEqual(['AL02']);
    expect([...(allergenMap.get('P-PS-001-R') || [])]).toEqual(['AL06']);
  });

  test('체크한 공통묶음 재료의 알레르기도 해당 메뉴에 집계된다', () => {
    const ingredientRows = [
      { productCode: 'COMMON-SAUCE', ingredientName: '공통소스', allergens: ['AL05'] },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [
        { menuCode: 'P-OR-003-L', menuName: '공통 테스트 L', category: '피자/오리지널' },
      ],
      detailRecipes: [
        {
          menuCode: 'P-OR-003-L',
          menuName: '공통 테스트 L',
          category: '피자/오리지널',
          size: 'L',
          components: [],
          selectedRecipeGroupIds: ['10'],
        },
      ],
      groups: [
        {
          id: 10,
          name: '피자 공통',
          defaultCategories: ['피자'],
          ingredients: [{ productCode: 'COMMON-SAUCE', ingredientName: '공통소스' }],
        },
      ],
    });

    const matrixRows = buildMenuMatrix(ingredientRows, mapData, [], () => false, [], {}, []);

    const rows = matrixRows.filter(row => row.sourceMenuCodes.includes('P-OR-003-L'));
    expect(rows).toHaveLength(4);
    expect(rows.every(row => row.allergenCodes.has('AL05'))).toBe(true);
  });

  test('비정상 입력은 빈 집계로 안전하게 처리한다', () => {
    expect(buildMenuAllergenMap()).toBeInstanceOf(Map);
    expect(buildMenuAllergenMap().size).toBe(0);
    expect(buildMenuAllergenMap({ ingredients: null, ingredientToMenus: {} }).size).toBe(0);
    expect(
      buildMenuAllergenMap({
        ingredients: [{ ingredientName: { ko: '치즈' }, allergens: ['AL02'] }, null, 'bad'],
        ingredientToMenus: new Map([['name:치즈', { bad: true }]]),
      }).size
    ).toBe(0);
  });
});

describe('allergenNames', () => {
  test('코드 Set을 한글 이름 쉼표 문자열로 변환하며 기본 표시 순서(ALLERGEN_SEED)를 따른다', () => {
    // ALLERGEN_SEED 기본 순서: 밀·대두·우유·... → 우유(AL02)가 계란(AL01)보다 앞선다.
    expect(allergenNames(new Set(['AL01', 'AL02']))).toBe('우유, 계란');
  });
  test('삽입 순서와 무관하게 항상 ALLERGEN_SEED 기본 순서로 정렬한다', () => {
    // Set에 역순으로 넣어도(삽입 순서 의존 X) 결과는 항상 동일한 기본 순서.
    const reversed = new Set(
      [
        'AL18', // 굴
        'AL19', // 전복
        'AL20', // 홍합
        'AL21', // 잣
        'AL11', // 복숭아
        'AL07', // 고등어
        'AL03', // 메밀
        'AL13', // 아황산류
        'AL04', // 땅콩
        'AL01', // 계란
        'AL14', // 호두
        'AL17', // 오징어
        'AL16', // 쇠고기
        'AL15', // 닭고기
        'AL08', // 게
        'AL09', // 새우
        'AL10', // 돼지고기
        'AL12', // 토마토
        'AL02', // 우유
        'AL05', // 대두
        'AL06', // 밀
      ].reverse()
    );
    expect(allergenNames(reversed)).toBe(
      '밀, 대두, 우유, 토마토, 돼지고기, 새우, 게, 닭고기, 쇠고기, 오징어, 호두, 계란, 땅콩, 아황산류, 메밀, 고등어, 복숭아, 잣, 홍합, 전복, 굴'
    );
  });

  test('알 수 없는 코드는 코드 그대로 폴백', () => {
    expect(allergenNames(new Set(['ZZ99']))).toBe('ZZ99');
  });
  test('빈 입력은 빈 문자열', () => {
    expect(allergenNames(new Set())).toBe('');
    expect(allergenNames(undefined)).toBe('');
    expect(allergenNames(new Set([null, 'ZZ99']))).toBe('ZZ99');
  });
});

describe('buildEdgeAllergenMap', () => {
  test('엣지 구성품 알레르기를 nutrition edgeCode별로 변환한다', () => {
    const map = buildEdgeAllergenMap({
      ingredients: [
        { productCode: 'EGG', ingredientName: '계란액', allergens: ['AL01'] },
        { productCode: 'MILK', ingredientName: '치즈', allergens: ['AL02'] },
      ],
      edges: [
        {
          edgeType: '치즈크러스트',
          size: 'L',
          components: [{ productCode: 'EGG' }, { productCode: 'MILK' }],
        },
      ],
    });

    expect([...(map.get('치즈크러스트L') || [])].sort()).toEqual(['AL01', 'AL02']);
  });

  test('엣지 구성품 productCode가 달라도 식자재명으로 알레르기를 집계한다', () => {
    const map = buildEdgeAllergenMap({
      ingredients: [{ productCode: 'REAL-EGG', displayName: '계란액', allergens: ['AL01'] }],
      edges: [
        {
          edgeType: '치즈크러스트',
          size: 'L',
          components: [{ productCode: 'OLD-EGG', ingredientName: '계란액' }],
        },
      ],
    });

    expect([...(map.get('치즈크러스트L') || [])]).toEqual(['AL01', 'AL02']);
  });

  test('씬바샤삭은 L 엣지 알레르기를 밀만 남기고 대두를 제거한다', () => {
    const map = buildEdgeAllergenMap({
      ingredients: [
        { productCode: 'SOY', ingredientName: '대두유', allergens: ['AL05'] },
        { productCode: 'WHEAT', ingredientName: '밀가루', allergens: ['AL06'] },
      ],
      edges: [
        {
          edgeType: '씬도우',
          size: 'L',
          components: [{ productCode: 'SOY' }, { productCode: 'WHEAT' }],
        },
      ],
    });

    expect([...(map.get('씬바사삭L') || [])]).toEqual(['AL06']);
    expect(map.has('씬바사삭' + 'R')).toBe(false);
  });

  test('치즈크러스트는 구성품 누락 시에도 우유 알레르기를 보정한다', () => {
    const map = buildEdgeAllergenMap({ ingredients: [], edges: [] });
    expect([...(map.get('치즈크러스트L') || [])]).toEqual(['AL02']);
    expect([...(map.get('치즈크러스트R') || [])]).toEqual(['AL02']);
  });

  test('골드스윗은 사이즈별 엣지 구성품 알레르기를 유지한다', () => {
    const map = buildEdgeAllergenMap({
      ingredients: [{ productCode: 'BUTTER', ingredientName: '버터', allergens: ['AL02'] }],
      edges: [
        {
          edgeType: '골드스윗크러스트',
          size: 'R',
          components: [{ productCode: 'BUTTER' }],
        },
      ],
    });

    expect([...(map.get('골드스윗R') || [])]).toEqual(['AL02']);
  });

  test('씬바샤삭은 기본 도우 알레르기를 빼고 씬도우 알레르기와 비도우 알레르기를 합산한다 (N-42)', () => {
    const ingredientRows = [
      {
        productCode: 'BASE-DOUGH',
        ingredientName: '기본도우',
        allergens: ['AL05'],
        category: '도우',
      },
      { productCode: 'SAUCE', ingredientName: '대두소스', allergens: ['AL05'] },
      { productCode: 'THIN-DOUGH', ingredientName: '씬도우', allergens: ['AL01', 'AL05', 'AL06'] },
    ];
    const mapData = buildIngredientMenuMap({
      menuMasters: [{ menuCode: 'PZ-THIN-L', menuName: '씬 테스트 L', category: '피자' }],
      detailRecipes: [
        {
          menuCode: 'PZ-THIN-L',
          menuName: '씬 테스트 L',
          category: '피자',
          components: [{ productCode: 'BASE-DOUGH' }, { productCode: 'SAUCE' }],
        },
      ],
    });
    const rows = buildMenuMatrix(
      ingredientRows,
      mapData,
      [
        {
          edgeType: '씬도우',
          size: 'L',
          components: [{ productCode: 'THIN-DOUGH' }],
        },
      ],
      () => false,
      [],
      {},
      []
    );

    const thin = rows.find(row => row.crust === '씬바샤삭');
    expect(thin).toBeTruthy();
    expect([...thin.allergenCodes].sort()).toEqual(['AL01', 'AL05', 'AL06']);
  });
});

describe('buildToppingAllergenMap', () => {
  test('추가토핑 알레르기는 토핑 입력값이 아니라 연결된 식자재 알레르기를 사용한다', () => {
    const map = buildToppingAllergenMap({
      ingredients: [{ productCode: 'ING-CHEESE', ingredientName: '치즈', allergens: ['AL02'] }],
      toppings: [
        {
          toppingCode: 'TOP-CHEESE',
          toppingName: '치즈 80g',
          productCode: 'ING-CHEESE',
          ingredientName: '치즈',
          allergens: ['AL99'],
        },
      ],
    });

    expect([...(map.get('TOP-CHEESE') || [])]).toEqual(['AL02']);
  });

  test('추가토핑 식자재코드로 알레르기를 집계한다', () => {
    const map = buildToppingAllergenMap({
      ingredients: [
        { productCode: 'TOP-ING', ingredientName: '페퍼로니', allergens: ['AL06'] },
        { productCode: 'OLD', ingredientName: '단종토핑', allergens: ['AL02'], discontinued: true },
      ],
      toppings: [
        { toppingCode: 'TOP-PEP', toppingName: '페퍼로니 추가', productCode: 'TOP-ING' },
        { toppingCode: 'TOP-OLD', toppingName: '단종 추가', productCode: 'OLD' },
      ],
    });

    expect([...(map.get('TOP-PEP') || [])]).toEqual(['AL06']);
    expect(map.has('TOP-OLD')).toBe(false);
  });

  test('식자재코드가 없으면 식자재명으로 추가토핑 알레르기를 매칭한다', () => {
    const map = buildToppingAllergenMap({
      ingredients: [{ ingredientName: '체다 치즈', allergens: ['AL02'] }],
      toppings: [{ toppingCode: 'TOP-CHZ', toppingName: '치즈 추가', ingredientName: '체다치즈' }],
    });

    expect([...(map.get('TOP-CHZ') || [])]).toEqual(['AL02']);
  });
});

/**
 * 알레르기 매트릭스의 "빈 행" 회귀 방지 (2026-09-23 주임님 PDF 대조에서 발견).
 * - 엣지 옵션 메뉴(석쇠·치즈크러스트·골드스윗·씬바사삭)는 레시피가 없어 알레르기가 빈칸으로
 *   나왔지만, 실제로는 해당 크러스트 구성품의 알레르기를 가진다.
 * - 추가토핑은 전용 토핑 행과 메뉴마스터 행이 겹쳐 같은 토핑이 두 줄(빈칸 + 정상)로 나왔다.
 */
describe('buildMenuMatrix — 엣지·추가토핑 행', () => {
  const ingredients = [
    { productCode: 'DOUGH', ingredientName: '도우', allergens: ['AL05', 'AL06'], category: '도우' },
    { productCode: 'STR', ingredientName: '스트링치즈', allergens: ['AL02'], category: '치즈류' },
    { productCode: 'PEP', ingredientName: '페페로니', allergens: ['AL10'], category: '토핑재료' },
  ];
  const menuMasters = [
    { menuCode: 'P-001-L', menuName: '페페로니 피자 L', category: '피자' },
    { menuCode: 'OPT-EDGE-001', menuName: '석쇠', category: '엣지' },
    { menuCode: 'OPT-EDGE-002-L', menuName: '치즈크러스트', category: '엣지' },
    { menuCode: 'T-ETC-002', menuName: '페페로니 12장 (29g)', category: '추가토핑' },
    { menuCode: 'T-ETC-004', menuName: '블랙올리브 32개', category: '추가토핑' },
  ];
  const mapData = buildIngredientMenuMap({
    menuMasters,
    detailRecipes: [
      {
        menuCode: 'P-001-L',
        menuName: '페페로니 피자 L',
        category: '피자',
        components: [
          { productCode: 'DOUGH', ingredientName: '도우' },
          { productCode: 'PEP', ingredientName: '페페로니' },
        ],
      },
    ],
  });
  const edges = [{ edgeType: '치즈크러스트', components: [{ productCode: 'STR' }] }];
  const toppings = [
    { toppingCode: 'T-ETC-002', toppingName: '페페로니 12(29g)', productCode: 'PEP' },
    { toppingCode: 'T-ETC-004', toppingName: '블랙올리브 32개', productCode: 'NONE' },
  ];

  const rowsOf = () =>
    buildMenuMatrix(ingredients, mapData, edges, () => false, [], {}, toppings, menuMasters);

  test('엣지 옵션 행은 그 크러스트 구성품의 알레르기를 보여준다', () => {
    const rows = rowsOf();
    const grill = rows.find(r => r.menuCode === 'OPT-EDGE-001');
    const cheese = rows.find(r => r.menuCode === 'OPT-EDGE-002-L');
    // 석쇠 = 기본 도우(대두·밀), 치즈크러스트 = 엣지 구성품(우유)
    expect([...grill.allergenCodes].sort()).toEqual(['AL05', 'AL06']);
    expect([...cheese.allergenCodes].sort()).toEqual(['AL02']);
  });

  test('전용 토핑 행이 있는 추가토핑은 메뉴마스터 빈 행을 만들지 않는다', () => {
    const rows = rowsOf();
    const pepperoniRows = rows.filter(r => /페페로니 12/.test(r.menuName));
    expect(pepperoniRows).toHaveLength(1);
    expect(pepperoniRows[0].rowKey).toBe('topping__T-ETC-002');
    expect([...pepperoniRows[0].allergenCodes]).toEqual(['AL10']);

    // 알레르기가 없어 전용 행이 안 생기는 토핑은 메뉴마스터 행으로 남는다
    const olive = rows.filter(r => /블랙올리브/.test(r.menuName));
    expect(olive).toHaveLength(1);
    expect(olive[0].rowKey).toBe('T-ETC-004');
    expect([...olive[0].allergenCodes]).toEqual([]);
  });
});
