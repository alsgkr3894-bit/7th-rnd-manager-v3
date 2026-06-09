import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const hasStore = jest.fn();
const getAll = jest.fn();
const runTransaction = jest.fn();

jest.unstable_mockModule('../../lib/db/index.js', () => ({
  hasStore: (...args) => hasStore(...args),
  getAll: (...args) => getAll(...args),
  runTransaction: (...args) => runTransaction(...args),
}));

const {
  getUserAliases,
  getUserRules,
  getUserExcluded,
} = await import('../../lib/sales/store-user-rules.js');

beforeEach(() => {
  jest.clearAllMocks();
  hasStore.mockReturnValue(true);
  getAll.mockResolvedValue([]);
});

describe('store-user-rules storage guards', () => {
  test('스토어가 없으면 조회하지 않고 빈 배열을 반환한다', async () => {
    hasStore.mockReturnValue(false);

    await expect(getUserAliases()).resolves.toEqual([]);
    await expect(getUserRules()).resolves.toEqual([]);
    await expect(getUserExcluded()).resolves.toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
  });

  test('별칭·규칙·제외 조회는 깨진 행을 객체 배열로 정규화한다', async () => {
    getAll.mockResolvedValue([null, 'bad', { id: 1 }, ['nested'], { id: 2 }]);

    await expect(getUserAliases()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    await expect(getUserRules()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    await expect(getUserExcluded()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });
});
