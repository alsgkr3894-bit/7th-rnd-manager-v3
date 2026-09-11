/**
 * setMenuMasterStatus / setMenuMasterStatusMany 단위 테스트.
 * status만 직접 patch하며 다른 필드(특히 price)를 건드리지 않는지 확인한다.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let rows = [];

function upsertRow(record) {
  const idx = rows.findIndex(r => r.id === record.id);
  if (idx >= 0) rows[idx] = record;
  else rows.push(record);
}

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(() => true),
  getAll: jest.fn(storeName => {
    if (storeName === 'menu_master') return Promise.resolve([...rows]);
    return Promise.resolve([]);
  }),
  runTransaction: jest.fn((_storeNames, _mode, work) => {
    const tx = {
      objectStore(storeName) {
        if (storeName !== 'menu_master') throw new Error(`unexpected store: ${storeName}`);
        return {
          put(record) {
            upsertRow(record);
          },
        };
      },
    };
    work(tx);
    return Promise.resolve();
  }),
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn().mockResolvedValue(undefined),
}));

const { assertActiveAdmin } = await import('@/lib/auth/guard');
const { setMenuMasterStatus, setMenuMasterStatusMany } =
  await import('../../lib/menu-master/store.js');

beforeEach(() => {
  rows = [];
  jest.clearAllMocks();
});

describe('setMenuMasterStatus', () => {
  test('status만 바뀌고 price 등 다른 필드는 보존된다', async () => {
    rows = [
      { id: 1, menuCode: 'PZ-001', menuName: '슈퍼콤비', price: 19900, status: 'discontinued' },
    ];
    await setMenuMasterStatus(1, 'active');
    const row = rows.find(r => r.id === 1);
    expect(row.status).toBe('active');
    expect(row.price).toBe(19900);
    expect(row.menuName).toBe('슈퍼콤비');
  });

  test('존재하지 않는 id면 에러를 던진다', async () => {
    rows = [{ id: 1, menuCode: 'A', menuName: 'A' }];
    await expect(setMenuMasterStatus(999, 'active')).rejects.toThrow('항목을 찾을 수 없습니다');
  });

  test('assertActiveAdmin을 호출한다', async () => {
    rows = [{ id: 1, menuCode: 'A', menuName: 'A' }];
    await setMenuMasterStatus(1, 'active');
    expect(assertActiveAdmin).toHaveBeenCalledWith('메뉴마스터 상태 변경');
  });
});

describe('setMenuMasterStatusMany', () => {
  test('여러 id의 status를 한 번에 바꾸고 price는 보존한다', async () => {
    rows = [
      { id: 1, menuCode: 'A', menuName: 'A', price: 1000, status: 'discontinued' },
      { id: 2, menuCode: 'B', menuName: 'B', price: 2000, status: 'discontinued' },
      { id: 3, menuCode: 'C', menuName: 'C', price: 3000, status: 'discontinued' },
    ];
    const result = await setMenuMasterStatusMany([1, 3], 'active');
    expect(result).toEqual({ updated: 2 });
    expect(rows.find(r => r.id === 1)).toMatchObject({ status: 'active', price: 1000 });
    expect(rows.find(r => r.id === 2)).toMatchObject({ status: 'discontinued', price: 2000 });
    expect(rows.find(r => r.id === 3)).toMatchObject({ status: 'active', price: 3000 });
  });

  test('빈 배열이면 updated:0 반환', async () => {
    rows = [{ id: 1, menuCode: 'A', menuName: 'A' }];
    expect(await setMenuMasterStatusMany([], 'active')).toEqual({ updated: 0 });
  });

  test('존재하지 않는 id는 건너뛴다', async () => {
    rows = [{ id: 1, menuCode: 'A', menuName: 'A' }];
    expect(await setMenuMasterStatusMany([999], 'active')).toEqual({ updated: 0 });
  });
});
