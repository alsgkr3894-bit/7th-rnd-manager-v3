import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const rowsByStore = {};
const deleteCalls = [];
const putCalls = [];
const mockGetAll = jest.fn(storeName => Promise.resolve(rowsByStore[storeName] || []));
const mockGetByIndex = jest.fn(() => Promise.resolve([]));
const mockPut = jest.fn(() => Promise.resolve(1));
const mockDeleteById = jest.fn(() => Promise.resolve());
const mockAssertActiveAdmin = jest.fn(async () => {});
let mockHasStore = jest.fn(() => true);

const mockRunTransaction = jest.fn((storeNames, mode, work) => {
  const tx = {
    objectStore(storeName) {
      return {
        delete(id) {
          deleteCalls.push([storeName, id]);
        },
        put(record) {
          putCalls.push([storeName, record]);
          return record;
        },
      };
    },
  };
  work(tx);
  return Promise.resolve();
});

jest.unstable_mockModule('@/lib/db', () => ({
  getAll: (...args) => mockGetAll(...args),
  getByIndex: (...args) => mockGetByIndex(...args),
  put: (...args) => mockPut(...args),
  deleteById: (...args) => mockDeleteById(...args),
  runTransaction: (...args) => mockRunTransaction(...args),
  hasStore: (...args) => mockHasStore(...args),
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: (...args) => mockAssertActiveAdmin(...args),
}));

const { deleteAllergenLinksByIngredient } = await import('../../lib/nutrition/allergen/store.js');
const { bulkUpsertBaseData, deleteMenuRef, deleteMenuRefsByMenuCodes } =
  await import('../../lib/nutrition/values/store.js');

beforeEach(() => {
  rowsByStore.nutrition_allergy_links = [];
  rowsByStore.nutrition_menu_ref = [];
  rowsByStore.nutrition_raw_values = [];
  deleteCalls.length = 0;
  putCalls.length = 0;
  mockGetAll.mockClear();
  mockGetByIndex.mockClear();
  mockPut.mockClear();
  mockDeleteById.mockClear();
  mockRunTransaction.mockClear();
  mockAssertActiveAdmin.mockClear();
  mockHasStore = jest.fn(() => true);
});

describe('nutrition_allergy_links linkage basis', () => {
  test('deleteAllergenLinksByIngredient는 ingredientId와 productCode 기준 링크만 삭제한다', async () => {
    rowsByStore.nutrition_allergy_links = [
      { id: 1, ingredientId: 10, productCode: 'A', allergenCodes: ['AL01'] },
      { id: 2, ingredientId: 99, productCode: 'P-001', allergenCodes: ['AL02'] },
      { id: 3, ingredientId: 99, productCode: 'OTHER', allergenCodes: ['AL03'] },
    ];

    const deleted = await deleteAllergenLinksByIngredient({
      ingredientId: 10,
      productCode: 'P-001',
    });

    expect(mockAssertActiveAdmin).toHaveBeenCalledWith('알레르기 링크 삭제');
    // 실행취소 복원을 위해 삭제한 링크 레코드 배열을 반환한다.
    expect(deleted.map(d => d.id)).toEqual([1, 2]);
    expect(deleteCalls).toEqual([
      ['nutrition_allergy_links', 1],
      ['nutrition_allergy_links', 2],
    ]);
  });

  test('deleteMenuRef는 menu_ref+원시값을 단일 트랜잭션으로 삭제하고 알레르기 링크를 건드리지 않는다', async () => {
    rowsByStore.nutrition_menu_ref = [{ id: 7, menuCode: 'MENU-1', menuName: '메뉴1' }];
    rowsByStore.nutrition_raw_values = [
      { id: 11, menuCode: 'MENU-1', crustType: '석쇠L' },
      { id: 12, menuCode: 'MENU-2', crustType: '석쇠L' },
    ];

    await deleteMenuRef(7, 'MENU-1');

    // 원자성을 위해 deleteById가 아니라 단일 다중스토어 트랜잭션을 사용한다.
    expect(mockDeleteById).not.toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalledWith(
      ['nutrition_menu_ref', 'nutrition_raw_values'],
      'readwrite',
      expect.any(Function)
    );
    expect(deleteCalls).toEqual([
      ['nutrition_menu_ref', 7],
      ['nutrition_raw_values', 11],
    ]);
    expect(mockGetByIndex).not.toHaveBeenCalledWith(
      'nutrition_allergy_links',
      'menuCode',
      'MENU-1'
    );
  });

  test('deleteMenuRefsByMenuCodes는 orphan 메뉴 ref와 원시값을 같은 transaction에서 정리한다', async () => {
    rowsByStore.nutrition_menu_ref = [
      { id: 7, menuCode: 'MENU-1', menuName: '구형 메뉴 1' },
      { id: 8, menuCode: 'MENU-2', menuName: '구형 메뉴 2' },
      { id: 9, menuCode: 'MENU-KEEP', menuName: '유지 메뉴' },
    ];
    rowsByStore.nutrition_raw_values = [
      { id: 11, menuCode: 'MENU-1', crustType: '석쇠L' },
      { id: 12, menuCode: 'MENU-2', crustType: '석쇠L' },
      { id: 13, menuCode: 'MENU-KEEP', crustType: '석쇠L' },
    ];

    const result = await deleteMenuRefsByMenuCodes(['MENU-1', 'MENU-2', 'MENU-1', '']);

    expect(result).toEqual({ deletedMenuRefs: 2, deletedRawValues: 2 });
    expect(mockRunTransaction).toHaveBeenCalledWith(
      ['nutrition_menu_ref', 'nutrition_raw_values'],
      'readwrite',
      expect.any(Function)
    );
    expect(deleteCalls).toEqual([
      ['nutrition_menu_ref', 7],
      ['nutrition_menu_ref', 8],
      ['nutrition_raw_values', 11],
      ['nutrition_raw_values', 12],
    ]);
  });

  test('bulkUpsertBaseData는 메뉴 ref와 raw value를 같은 transaction에서 저장하고 중복을 정리한다', async () => {
    rowsByStore.nutrition_menu_ref = [
      { id: 1, menuCode: 'MENU-1', menuName: '구형', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 2, menuCode: 'MENU-1', menuName: '중복', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    rowsByStore.nutrition_raw_values = [
      {
        id: 10,
        menuCode: 'MENU-1',
        menuName: '구형',
        crustType: '석쇠L',
        kcal: 10,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 11,
        menuCode: 'MENU-1',
        menuName: '중복',
        crustType: '석쇠L',
        kcal: 20,
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    const result = await bulkUpsertBaseData([
      {
        menuCode: 'MENU-1',
        menuName: '신규명',
        category: '피자',
        crustType: '석쇠L',
        rawValue: {
          menuCode: 'MENU-1',
          menuName: '신규명',
          category: '피자',
          crustType: '석쇠L',
          kcal: 500,
        },
      },
    ]);

    expect(result).toEqual({ menuRefs: 1, rawValues: 1 });
    expect(mockAssertActiveAdmin).toHaveBeenCalledWith('영양 기준데이터 일괄 가져오기 저장');
    expect(mockRunTransaction).toHaveBeenCalledWith(
      ['nutrition_menu_ref', 'nutrition_raw_values'],
      'readwrite',
      expect.any(Function)
    );
    expect(putCalls).toEqual([
      [
        'nutrition_menu_ref',
        expect.objectContaining({
          id: 1,
          menuCode: 'MENU-1',
          menuName: '신규명',
          category: '피자',
        }),
      ],
      [
        'nutrition_raw_values',
        expect.objectContaining({
          id: 10,
          menuCode: 'MENU-1',
          menuName: '신규명',
          category: '피자',
          crustType: '석쇠L',
          kcal: 500,
        }),
      ],
    ]);
    expect(deleteCalls).toEqual([
      ['nutrition_menu_ref', 2],
      ['nutrition_raw_values', 11],
    ]);
  });
});
