import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 2026-11-26 점검 목록 4번: 일괄 실행취소가 일부 실패하면 어떤 식자재인지 알려 준다.
const restored = [];
let failIds = new Set();
jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: () => false,
  restoreRecord: jest.fn(async (_store, record) => {
    if (failIds.has(record.id)) throw new Error('쓰기 실패');
    restored.push(record.id);
  }),
}));
jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin: async () => {} }));
jest.unstable_mockModule('@/components/Toast', () => ({ showToast: () => {} }));
jest.unstable_mockModule('@/components/jette/managed-products-constants', () => ({
  TYPE_LABEL: {},
}));
jest.unstable_mockModule('@/lib/shipment', () => ({
  getManagedProducts: async () => [],
  addManagedProduct: async () => {},
  updateManagedProduct: async () => {},
}));

const { restoreDeletedIngredientBackups } =
  await import('../../app/ingredient/manage/ingredientManageUtils.js');

const backup = (id, extra) => ({ ingredient: { id, ...extra } });

beforeEach(() => {
  restored.length = 0;
  failIds = new Set();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('restoreDeletedIngredientBackups', () => {
  test('실패한 항목의 제품코드·이름을 알리고 나머지는 복구한다', async () => {
    failIds = new Set([1, 3]);
    await expect(
      restoreDeletedIngredientBackups([
        backup(1, { productCode: 'AB-1', ingredientName: '치즈' }),
        backup(2, { ingredientName: '소스' }),
        backup(3, { ingredientName: '수동 파슬리' }),
      ])
    ).rejects.toThrow('2개 항목 복구 실패: AB-1, 수동 파슬리');
    expect(restored).toEqual([2]);
  });

  test('실패가 많으면 5개까지만 적고 남은 수를 붙인다', async () => {
    failIds = new Set([1, 2, 3, 4, 5, 6, 7]);
    const backups = [...failIds].map(id => backup(id, { ingredientName: `식자재${id}` }));
    await expect(restoreDeletedIngredientBackups(backups)).rejects.toThrow('식자재5 외 2개');
  });

  test('모두 성공하면 조용히 끝난다', async () => {
    await restoreDeletedIngredientBackups([backup(1), backup(2)]);
    expect(restored).toEqual([1, 2]);
  });
});
