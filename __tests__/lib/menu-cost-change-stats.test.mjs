import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getPriceFiles = jest.fn();
const getPriceRowsByFileId = jest.fn();
const getAllMenuMaster = jest.fn();
const loadMenuRecipeMaps = jest.fn();
const getAllIngredients = jest.fn();
const getAllRecipeGroups = jest.fn();
const getActiveBrandId = jest.fn();
const priceUploadListeners = [];

jest.unstable_mockModule('@/lib/db', () => ({ hasStore: (...a) => hasStore(...a) }));
jest.unstable_mockModule('@/lib/price', () => ({
  getPriceFiles: (...a) => getPriceFiles(...a),
  getPriceRowsByFileId: (...a) => getPriceRowsByFileId(...a),
}));
jest.unstable_mockModule('@/lib/price/price-events', () => ({
  onPriceUpload: fn => {
    priceUploadListeners.push(fn);
    return () => {};
  },
}));
jest.unstable_mockModule('@/lib/menu-master', () => ({
  getAllMenuMaster: (...a) => getAllMenuMaster(...a),
}));
jest.unstable_mockModule('@/lib/menu-recipes', () => ({
  loadMenuRecipeMaps: (...a) => loadMenuRecipeMaps(...a),
}));
jest.unstable_mockModule('@/lib/ingredient', () => ({
  getAllIngredients: (...a) => getAllIngredients(...a),
}));
jest.unstable_mockModule('@/lib/cost/recipe-groups/store', () => ({
  getAllRecipeGroups: (...a) => getAllRecipeGroups(...a),
}));
jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: (...a) => getActiveBrandId(...a),
}));

// price-file-cost.js는 자체 node 테스트(price-file-cost.test.mjs)로 이미 검증했다 —
// 여기서는 그 순수 계산을 다시 실행하지 않고, 이 모듈이 "어느 파일 조합으로 호출하고
// 캐시/이벤트를 어떻게 다루는지"(오케스트레이션)만 검증한다. 실제 모듈을 그대로 로드하면
// buildMenuRecipeSummaryMap 등 깊은 의존성 체인(가격조회·레시피그룹 등)까지 전부 목킹해야
// 해서 테스트가 그 내부 구현에 지나치게 결합된다.
const buildPriceRowMap = jest.fn(rows => new Map((rows || []).map(r => [r.productCode, r])));
const buildMenuCostMap = jest.fn(({ priceRowMap }) => priceRowMap);
const diffMenuCostMaps = jest.fn((before, after) => {
  if (before === after) return [];
  return [{ menuCode: 'P-001', beforeCost: 500, afterCost: 1000, costDelta: 500 }];
});
jest.unstable_mockModule('@/lib/cost/history/price-file-cost', () => ({
  buildPriceRowMap,
  buildMenuCostMap,
  diffMenuCostMaps,
}));

const { getMenuCostChanges, invalidateMenuCostChangeCache } =
  await import('../../lib/stats/menu-cost-change-stats.js');

beforeEach(() => {
  jest.clearAllMocks();
  // onPriceUpload 구독은 모듈이 처음 import될 때 한 번만 등록된다(모듈 스코프) —
  // beforeEach마다 리스너 배열을 비우면 안 된다, 구독 자체가 매번 다시 일어나지 않는다.
  invalidateMenuCostChangeCache();
  hasStore.mockReturnValue(true);
  getActiveBrandId.mockReturnValue('main');
  getAllMenuMaster.mockResolvedValue([{ menuCode: 'P-001', menuName: '테스트피자' }]);
  loadMenuRecipeMaps.mockResolvedValue({ pizza: new Map() });
  getAllIngredients.mockResolvedValue([]);
  getAllRecipeGroups.mockResolvedValue([]);
});

describe('getMenuCostChanges', () => {
  test('필수 스토어가 없으면 빈 결과를 반환하고 아무것도 조회하지 않는다', async () => {
    hasStore.mockReturnValue(false);
    const result = await getMenuCostChanges();
    expect(result).toEqual({ items: [], baseDate: null, targetDate: null, total: 0 });
    expect(getPriceFiles).not.toHaveBeenCalled();
  });

  test('단가파일이 1개 이하면 NO_BASELINE으로 빈 목록을 반환한다', async () => {
    getPriceFiles.mockResolvedValue([{ id: 1, updateDate: '2026-09-01' }]);
    const result = await getMenuCostChanges();
    expect(result.items).toEqual([]);
    expect(result.reason).toBe('NO_BASELINE');
    expect(result.targetDate).toBe('2026-09-01');
  });

  test('최신 2개 단가파일로 원가 변동 메뉴를 계산한다', async () => {
    getPriceFiles.mockResolvedValue([
      { id: 2, updateDate: '2026-09-08' },
      { id: 1, updateDate: '2026-09-01' },
    ]);
    getPriceRowsByFileId.mockImplementation(async fileId => {
      if (fileId === 1) return [{ productCode: 'CHZ', priceWithTax: 1000 }];
      if (fileId === 2) return [{ productCode: 'CHZ', priceWithTax: 2000 }];
      return [];
    });

    const result = await getMenuCostChanges();

    expect(result.baseDate).toBe('2026-09-01');
    expect(result.targetDate).toBe('2026-09-08');
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      menuCode: 'P-001',
      beforeCost: 500,
      afterCost: 1000,
      costDelta: 500,
    });
  });

  test('같은 파일 조합을 다시 조회하면 캐시를 재사용해 DB를 다시 읽지 않는다', async () => {
    getPriceFiles.mockResolvedValue([
      { id: 2, updateDate: '2026-09-08' },
      { id: 1, updateDate: '2026-09-01' },
    ]);
    getPriceRowsByFileId.mockResolvedValue([{ productCode: 'CHZ', priceWithTax: 1000 }]);

    await getMenuCostChanges();
    getAllMenuMaster.mockClear();
    await getMenuCostChanges();

    expect(getAllMenuMaster).not.toHaveBeenCalled();
  });

  test('단가 업로드 이벤트가 발생하면 캐시를 무효화해 다시 계산한다', async () => {
    getPriceFiles.mockResolvedValue([
      { id: 2, updateDate: '2026-09-08' },
      { id: 1, updateDate: '2026-09-01' },
    ]);
    getPriceRowsByFileId.mockResolvedValue([{ productCode: 'CHZ', priceWithTax: 1000 }]);

    await getMenuCostChanges();
    expect(priceUploadListeners).toHaveLength(1);
    priceUploadListeners[0]();
    getAllMenuMaster.mockClear();
    await getMenuCostChanges();

    expect(getAllMenuMaster).toHaveBeenCalledTimes(1);
  });
});
