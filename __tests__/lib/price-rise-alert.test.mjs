import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-10-30 주임님 요청: 제때 단가나 수동 단가로 원가가 오른 메뉴를 알림·팝업으로 보여 준다.
// (계산 자체는 price-rise.test.mjs) 여기서는 데이터 로드·알림 보관·홈 알림·저장 연결을 검증한다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// ── 저장소·브랜드 목 ─────────────────────────────────────────────────────────
const store = new Map();
let brand = 'main';
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => brand }));
jest.unstable_mockModule('@/lib/note/storage', () => ({
  getJSONLS: key => (store.has(key) ? JSON.parse(store.get(key)) : null),
  setJSONLS: (key, value) => store.set(key, JSON.stringify(value)),
}));

// ── DB 목 (제때 단가 2파일 + 식자재 + 레시피) ────────────────────────────────
const files = [
  { id: 2, updateDate: '2026-10-27' },
  { id: 1, updateDate: '2026-10-20' },
];
const rowsByFile = {
  1: [{ productCode: 'CHEESE', priceWithTax: 10000 }],
  2: [{ productCode: 'CHEESE', priceWithTax: 12000 }],
};
const ingredients = [
  {
    id: 1,
    productCode: 'CHEESE',
    ingredientName: '모짜렐라',
    baseQuantity: 1000,
    baseUnitType: 'g',
  },
];
const menus = [
  {
    menuCode: 'P-1-L',
    menuName: '치즈 피자 L',
    category: '피자/오리지널',
    price: 20000,
    status: 'active',
  },
];
const recipeMaps = {
  pizza: new Map([
    [
      'P-1-L',
      {
        menuCode: 'P-1-L',
        components: [
          { productCode: 'CHEESE', ingredientName: '모짜렐라', quantity: 100, unit: 'g' },
        ],
      },
    ],
  ]),
};
let currentFiles = files;
jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: jest.fn(async () => currentFiles),
  getPriceRowsByFileId: jest.fn(async id => rowsByFile[id] || []),
}));
jest.unstable_mockModule('@/lib/ingredient', () => ({
  getAllIngredients: jest.fn(async () => ingredients),
}));
jest.unstable_mockModule('@/lib/menu-master', () => ({
  getAllMenuMaster: jest.fn(async () => menus),
}));
const actualMenuRecipes = await import('../../lib/menu-recipes/index.js');
jest.unstable_mockModule('@/lib/menu-recipes', () => ({
  ...actualMenuRecipes,
  loadMenuRecipeMaps: jest.fn(async () => recipeMaps),
}));
jest.unstable_mockModule('@/lib/cost/recipe-groups/store', () => ({
  getAllRecipeGroups: jest.fn(async () => []),
}));

const { computeJetteUploadRises, computeManualPriceRises } =
  await import('../../lib/cost/price-rise-service.js');
const pending = await import('../../lib/cost/price-rise-pending.js');
const { buildPriceRiseActions, buildAllActions } = await import('../../lib/action-center/build.js');
const { changesCostInputs } = await import('../../lib/cost/changes-cost-inputs.js');

beforeEach(() => {
  store.clear();
  brand = 'main';
  currentFiles = files;
});

describe('제때 단가 업로드 직후 계산', () => {
  test('직전 파일 → 최신 파일로 원가가 오른 메뉴와 원인을 준다', async () => {
    const result = await computeJetteUploadRises('2026-10-27');
    expect(result).toMatchObject({
      source: 'jette',
      baseDate: '2026-10-20',
      targetDate: '2026-10-27',
      total: 1,
    });
    expect(result.items[0]).toMatchObject({
      menuName: '치즈 피자 L',
      beforeCost: 1000,
      afterCost: 1200,
    });
    expect(result.items[0].causes[0].name).toBe('모짜렐라');
  });

  test('단가파일이 하나뿐이면 비교할 이전 단가가 없어 알릴 게 없다', async () => {
    currentFiles = [files[0]];
    expect(await computeJetteUploadRises('2026-10-27')).toMatchObject({ total: 0, items: [] });
  });

  test('과거 날짜로 올린 파일(최신이 아님)은 현재 단가가 바뀐 게 아니라 알리지 않는다', async () => {
    expect(await computeJetteUploadRises('2026-10-01')).toMatchObject({ total: 0, items: [] });
  });
});

describe('수동 단가 저장 직후 계산', () => {
  test('저장 전/후 식자재 목록으로 수동 단가 상승을 잡는다', async () => {
    const manualBefore = [
      {
        id: 9,
        ingredientName: '수동소스',
        baseQuantity: 1000,
        baseUnitType: 'g',
        priceOverride: 5000,
      },
    ];
    const manualAfter = [{ ...manualBefore[0], priceOverride: 6000 }];
    menus.push({
      menuCode: 'S-1',
      menuName: '소스 사이드',
      category: '사이드',
      price: 5000,
      status: 'active',
    });
    recipeMaps.side = new Map([
      [
        'S-1',
        { menuCode: 'S-1', components: [{ ingredientName: '수동소스', quantity: 200, unit: 'g' }] },
      ],
    ]);
    const result = await computeManualPriceRises(manualBefore, manualAfter, '수동소스');
    expect(result).toMatchObject({ source: 'manual', label: '수동소스', total: 1 });
    expect(result.items[0]).toMatchObject({ menuCode: 'S-1', beforeCost: 1000, afterCost: 1200 });
  });
});

describe('확인 전 알림 보관', () => {
  const result = {
    source: 'jette',
    baseDate: '2026-10-20',
    targetDate: '2026-10-27',
    total: 40,
    items: Array.from({ length: 40 }, (_, i) => ({
      menuCode: `P-${i}`,
      menuName: `메뉴${i}`,
      beforeCost: 1000,
      afterCost: 1100,
      costDelta: 100,
      costDeltaPct: 10,
      causes: [{ name: '모짜렐라', deltaCost: 100 }],
    })),
  };

  test('저장하면 읽을 수 있고 [확인]으로 지우면 사라진다', () => {
    expect(pending.readPendingPriceRise()).toBeNull();
    pending.savePendingPriceRise(result);
    const saved = pending.readPendingPriceRise();
    expect(saved).toMatchObject({ source: 'jette', total: 40 });
    expect(saved.items).toHaveLength(30); // 저장 크기를 줄이려고 상위 30개만
    expect(saved.items[0]).toMatchObject({ menuName: '메뉴0', cause: '모짜렐라' });
    pending.clearPendingPriceRise();
    expect(pending.readPendingPriceRise()).toBeNull();
  });

  test('올라간 메뉴가 없으면 저장하지 않는다', () => {
    expect(pending.savePendingPriceRise({ total: 0, items: [] })).toBeNull();
    expect(pending.readPendingPriceRise()).toBeNull();
  });

  test('브랜드마다 따로 보관한다', () => {
    pending.savePendingPriceRise(result);
    brand = 'icheon';
    expect(pending.readPendingPriceRise()).toBeNull();
    expect(pending.priceRisePendingKey('icheon')).not.toBe(pending.priceRisePendingKey('main'));
  });

  test('깨진 값은 무시한다', () => {
    store.set(pending.priceRisePendingKey(), JSON.stringify({ total: 3 })); // items 없음
    expect(pending.readPendingPriceRise()).toBeNull();
    store.set(pending.priceRisePendingKey(), JSON.stringify([1, 2]));
    expect(pending.readPendingPriceRise()).toBeNull();
  });
});

describe('홈 "오늘 할 일" 알림', () => {
  const pendingValue = {
    createdAt: 1730000000000,
    source: 'manual',
    total: 3,
    items: [{ menuName: '치즈 피자 L', costDelta: 200.4, cause: '모짜렐라' }],
  };

  test('원가 상승 메뉴가 있으면 경고 항목이 하나 생긴다', () => {
    const [item] = buildPriceRiseActions({ priceRisePending: pendingValue });
    expect(item).toMatchObject({
      source: 'cost',
      title: '원가 상승 메뉴 3개',
      severity: 'warn',
      href: '/cost/margin',
    });
    expect(item.desc).toContain('수동 단가');
    expect(item.desc).toContain('치즈 피자 L +200원 (모짜렐라) 외 2개');
    expect(item.id).toContain('price-rise__1730000000000');
  });

  test('알림이 없거나 비어 있으면 항목이 없고, 전체 목록에 합쳐진다', () => {
    expect(buildPriceRiseActions({})).toEqual([]);
    expect(buildPriceRiseActions({ priceRisePending: { total: 0, items: [] } })).toEqual([]);
    const all = buildAllActions({ priceRisePending: pendingValue, canEdit: true });
    expect(all.some(i => i.title === '원가 상승 메뉴 3개')).toBe(true);
    expect(buildAllActions({ canEdit: true }).some(i => i.title.startsWith('원가 상승'))).toBe(
      false
    );
  });
});

describe('식자재 저장 연결', () => {
  test('수동 단가·포장수량·포장 단위를 바꿨을 때만 비교한다(새 식자재는 제외)', () => {
    expect(typeof changesCostInputs).toBe('function');
    const target = { id: 1, priceOverride: 5000, baseQuantity: 1000, baseUnitType: 'g' };
    expect(
      changesCostInputs(target, { priceOverride: 6000, baseQuantity: 1000, baseUnitType: 'g' })
    ).toBe(true);
    expect(
      changesCostInputs(target, { priceOverride: '5000', baseQuantity: 1000, baseUnitType: 'g' })
    ).toBe(false);
    expect(
      changesCostInputs(target, { priceOverride: 5000, baseQuantity: 500, baseUnitType: 'g' })
    ).toBe(true);
    expect(
      changesCostInputs(target, { priceOverride: 5000, baseQuantity: 1000, baseUnitType: '개' })
    ).toBe(true);
    expect(changesCostInputs('new', { priceOverride: 6000 })).toBe(false);
    expect(changesCostInputs({ __copyFrom: target }, { priceOverride: 6000 })).toBe(false);
  });

  test('화면 연결: 제때 업로드·식자재 저장·홈이 같은 알림을 쓴다', () => {
    expect(read('lib/price/use-price-upload.js')).toContain('computeJetteUploadRises(updateDate)');
    expect(read('app/jette/price-compare/page.jsx')).toContain('<PriceRiseModal');
    expect(read('app/ingredient/manage/useIngredientSaveAction.js')).toContain(
      'computeManualPriceRises'
    );
    expect(read('app/ingredient/manage/page.jsx')).toContain('<PriceRiseModal');
    expect(read('app/page.jsx')).toContain('priceRisePending={priceRisePending}');
    expect(read('components/cost/PriceRiseModal.jsx')).toContain('원가가 오른 메뉴');
  });
});
