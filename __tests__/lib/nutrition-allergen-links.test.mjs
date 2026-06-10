import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const rowsByStore = {};
const deleteCalls = [];
const mockGetAll = jest.fn(storeName => Promise.resolve(rowsByStore[storeName] || []));
const mockGetByIndex = jest.fn(() => Promise.resolve([]));
const mockPut = jest.fn(() => Promise.resolve(1));
const mockDeleteById = jest.fn(() => Promise.resolve());
let mockHasStore = jest.fn(() => true);

const mockRunTransaction = jest.fn((storeNames, mode, work) => {
  const tx = {
    objectStore(storeName) {
      return {
        delete(id) {
          deleteCalls.push([storeName, id]);
        },
        put(record) {
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

const { deleteAllergenLinksByIngredient } = await import('../../lib/nutrition/allergen/store.js');
const { deleteMenuRef } = await import('../../lib/nutrition/values/store.js');

beforeEach(() => {
  rowsByStore.nutrition_allergy_links = [];
  rowsByStore.nutrition_raw_values = [];
  deleteCalls.length = 0;
  mockGetAll.mockClear();
  mockGetByIndex.mockClear();
  mockPut.mockClear();
  mockDeleteById.mockClear();
  mockRunTransaction.mockClear();
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

    expect(deleted).toBe(2);
    expect(deleteCalls).toEqual([
      ['nutrition_allergy_links', 1],
      ['nutrition_allergy_links', 2],
    ]);
  });

  test('deleteMenuRef는 영양 원시값만 삭제하고 알레르기 링크를 건드리지 않는다', async () => {
    rowsByStore.nutrition_raw_values = [
      { id: 11, menuCode: 'MENU-1', crustType: '석쇠L' },
      { id: 12, menuCode: 'MENU-2', crustType: '석쇠L' },
    ];

    await deleteMenuRef(7, 'MENU-1');

    expect(mockDeleteById).toHaveBeenCalledWith('nutrition_menu_ref', 7);
    expect(deleteCalls).toEqual([['nutrition_raw_values', 11]]);
    expect(mockGetByIndex).not.toHaveBeenCalledWith(
      'nutrition_allergy_links',
      'menuCode',
      'MENU-1'
    );
  });
});
