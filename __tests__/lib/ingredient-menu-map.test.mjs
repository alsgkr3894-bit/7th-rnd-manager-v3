import {
  buildIngredientMenuMap,
  getMenusForIngredient,
} from '../../lib/cost/ingredient-menu-map.js';

const MENUS = [
  { menuCode: 'P-OR-001-L', menuName: '오리지널콤보 L', category: '피자' },
  { menuCode: 'P-OR-001-R', menuName: '오리지널콤보 R', category: '피자' },
  { menuCode: 'S-CHK-001', menuName: '치킨텐더', category: '사이드' },
];

const DETAIL_RECIPES = [
  {
    menuCode: 'P-OR-001-L',
    menuName: '오리지널콤보 L',
    category: '피자',
    components: [
      { productCode: 'ING-001', ingredientName: '토마토소스' },
      { productCode: null, ingredientName: '모짜렐라치즈' },
    ],
  },
  {
    menuCode: 'S-CHK-001',
    menuName: '치킨텐더',
    category: '사이드',
    components: [{ productCode: 'ING-002', ingredientName: '닭다리살' }],
  },
];

describe('buildIngredientMenuMap', () => {
  describe('레시피 직접 구성품', () => {
    test('productCode 있는 식자재 → 해당 menuCode에 매핑', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: DETAIL_RECIPES,
      });
      const menus = ingredientToMenus.get('code:ING-001');
      expect(menus).toBeTruthy();
      expect(menus.has('P-OR-001-L')).toBe(true);
    });

    test('레시피 size를 매핑 meta에 보존한다', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: [
          {
            menuCode: 'P-OR-001-L',
            menuName: '오리지널콤보 L',
            category: '피자',
            size: 'L',
            components: [{ productCode: 'ING-001', ingredientName: '토마토소스' }],
          },
        ],
      });

      expect(ingredientToMenus.get('code:ING-001')?.get('P-OR-001-L')?.size).toBe('L');
    });

    test('productCode 없는 식자재 → name 키로 매핑', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: DETAIL_RECIPES,
      });
      const menus = ingredientToMenus.get('name:모짜렐라치즈');
      expect(menus).toBeTruthy();
      expect(menus.has('P-OR-001-L')).toBe(true);
    });

    test('productCode 있는 식자재도 name 키를 함께 매핑해 과거 레시피 코드 불일치를 보완한다', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: [
          {
            menuCode: 'S-CHK-001',
            menuName: '치킨텐더',
            category: '사이드',
            components: [{ productCode: 'OLD-CODE', ingredientName: '닭다리살' }],
          },
        ],
      });
      expect(ingredientToMenus.get('code:OLD-CODE')?.has('S-CHK-001')).toBe(true);
      expect(ingredientToMenus.get('name:닭다리살')?.has('S-CHK-001')).toBe(true);
    });

    test('productCode 키는 대소문자 차이에도 조회된다', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: [
          {
            menuCode: 'S-CHK-001',
            menuName: '치킨텐더',
            category: '사이드',
            components: [{ productCode: 'ing-mix-01', ingredientName: '소스' }],
          },
        ],
      });

      expect(ingredientToMenus.get('code:ING-MIX-01')?.has('S-CHK-001')).toBe(true);
      expect(getMenusForIngredient(ingredientToMenus, 'ING-MIX-01', '').has('S-CHK-001')).toBe(
        true
      );
    });

    test('사이드 레시피도 매핑', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: DETAIL_RECIPES,
      });
      const menus = ingredientToMenus.get('code:ING-002');
      expect(menus.get('S-CHK-001').category).toBe('사이드');
    });

    test('menuToIngredients 역방향 매핑', () => {
      const { menuToIngredients } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: DETAIL_RECIPES,
      });
      const keys = menuToIngredients.get('P-OR-001-L');
      expect(keys.has('code:ING-001')).toBe(true);
      expect(keys.has('name:모짜렐라치즈')).toBe(true);
    });
  });

  describe('공통묶음 selectedRecipeGroupIds', () => {
    const GROUPS = [
      {
        id: 10,
        name: '피자 공통',
        defaultCategories: ['피자'],
        ingredients: [{ productCode: 'ING-CHZ', ingredientName: '공통치즈' }],
      },
    ];

    test('메뉴 레시피에서 체크한 공통묶음 재료만 해당 메뉴에 매핑', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: [
          {
            menuCode: 'P-OR-001-L',
            menuName: '오리지널콤보 L',
            category: '피자',
            size: 'L',
            components: [],
            selectedRecipeGroupIds: ['10'],
          },
        ],
        groups: GROUPS,
      });
      const menus = ingredientToMenus.get('code:ING-CHZ');
      expect(menus.has('P-OR-001-L')).toBe(true);
      expect(menus.has('P-OR-001-R')).toBe(false);
      expect(menus.has('S-CHK-001')).toBe(false);
    });

    test('체크하지 않은 공통묶음은 카테고리가 맞아도 매핑하지 않는다', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        detailRecipes: [
          {
            menuCode: 'P-OR-001-L',
            menuName: '오리지널콤보 L',
            category: '피자',
            size: 'L',
            components: [],
          },
        ],
        groups: GROUPS,
      });
      expect(ingredientToMenus.get('code:ING-CHZ')).toBeUndefined();
    });
  });

  describe('엣지 components — 피자 전체 매핑 (치즈크러스트·도우)', () => {
    const EDGES = [
      {
        edgeType: '치즈크러스트',
        size: 'L',
        expandInMargin: true,
        components: [{ productCode: 'ING-MOZZARELLA', ingredientName: '모짜렐라치즈블록' }],
      },
    ];

    test('엣지 재료가 피자 카테고리 전체 메뉴에 매핑', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({ menuMasters: MENUS, edges: EDGES });
      const menus = ingredientToMenus.get('code:ING-MOZZARELLA');
      expect(menus.has('P-OR-001-L')).toBe(true);
      expect(menus.has('P-OR-001-R')).toBe(true);
      // 사이드는 미포함
      expect(menus.has('S-CHK-001')).toBe(false);
    });

    test('엣지 재료는 새 피자 하위분류에 적용되고 1인피자는 제외된다', () => {
      const menuMasters = [
        ...MENUS,
        { menuCode: 'P-NEW-001-L', menuName: '신메뉴 L', category: '피자/신메뉴' },
        { menuCode: 'P-ONE-001', menuName: '1인피자', category: '1인피자' },
      ];
      const { ingredientToMenus } = buildIngredientMenuMap({ menuMasters, edges: EDGES });
      const menus = ingredientToMenus.get('code:ING-MOZZARELLA');

      expect(menus.has('P-NEW-001-L')).toBe(true);
      expect(menus.has('P-ONE-001')).toBe(false);
    });

    test('expandInMargin=false 엣지는 매핑 제외', () => {
      const disabledEdge = [
        {
          edgeType: '씬도우',
          expandInMargin: false,
          components: [{ productCode: 'ING-DOUGH', ingredientName: '도우' }],
        },
      ];
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        edges: disabledEdge,
      });
      expect(ingredientToMenus.get('code:ING-DOUGH')).toBeUndefined();
    });

    test('expandInMargin 미정의(레거시) 엣지는 포함', () => {
      const legacyEdge = [
        {
          edgeType: '치즈크러스트',
          components: [{ productCode: 'ING-LEG', ingredientName: '레거시재료' }],
        },
      ];
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        edges: legacyEdge,
      });
      expect(ingredientToMenus.get('code:ING-LEG')?.has('P-OR-001-L')).toBe(true);
    });
  });

  describe('구형 레시피(oldRecipes) 차단', () => {
    const OLD = [
      {
        menuCode: 'P-OR-001-L',
        menuName: '오리지널콤보 L',
        menuCategory: '피자',
        ingredients: [{ productCode: 'OLD-001', ingredientName: '구형재료' }],
        groupIds: [20],
      },
    ];

    test('구형 레시피 ingredients는 더 이상 매핑하지 않는다', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({ menuMasters: MENUS, oldRecipes: OLD });
      expect(ingredientToMenus.get('code:OLD-001')).toBeUndefined();
    });

    test('구형 레시피 groupIds 묶음도 더 이상 매핑하지 않는다', () => {
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: MENUS,
        oldRecipes: OLD,
        groups: [
          {
            id: 20,
            name: 'groupIds 묶음',
            defaultCategories: [],
            ingredients: [{ productCode: 'GRP-001', ingredientName: '묶음재료' }],
          },
        ],
      });
      expect(ingredientToMenus.get('code:GRP-001')).toBeUndefined();
    });
  });
});

describe('getMenusForIngredient', () => {
  const { ingredientToMenus } = buildIngredientMenuMap({
    menuMasters: MENUS,
    detailRecipes: DETAIL_RECIPES,
  });

  test('productCode로 조회', () => {
    const result = getMenusForIngredient(ingredientToMenus, 'ING-001', '토마토소스');
    expect(result.has('P-OR-001-L')).toBe(true);
  });

  test('ingredientName으로 조회 (productCode null)', () => {
    const result = getMenusForIngredient(ingredientToMenus, null, '모짜렐라치즈');
    expect(result.has('P-OR-001-L')).toBe(true);
  });

  test('미매핑 재료 → 빈 Map', () => {
    const result = getMenusForIngredient(ingredientToMenus, null, '없는재료');
    expect(result.size).toBe(0);
  });
});
