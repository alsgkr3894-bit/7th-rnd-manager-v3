/**
 * "미등록" 자동 판정 개별 해제(ref_registered_overrides) CRUD 단위 테스트.
 * getRefRegisteredOverrides / addRefRegisteredOverride / deleteRefRegisteredOverrideByName
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let rows = [];
let nextId = 1;

function upsertRow(record) {
  const row = { ...record };
  if (row.id == null) row.id = nextId++;
  const idx = rows.findIndex(r => r.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
}

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(() => true),
  getAll: jest.fn(storeName => {
    if (storeName === 'ref_registered_overrides') return Promise.resolve([...rows]);
    return Promise.resolve([]);
  }),
  runTransaction: jest.fn((_storeNames, _mode, work) => {
    const tx = {
      objectStore(storeName) {
        if (storeName !== 'ref_registered_overrides') {
          throw new Error(`unexpected store: ${storeName}`);
        }
        return {
          add(record) {
            upsertRow(record);
          },
          delete(id) {
            rows = rows.filter(r => r.id !== id);
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
const { getRefRegisteredOverrides, addRefRegisteredOverride, deleteRefRegisteredOverrideByName } =
  await import('../../lib/sales/store-user-rules.js');

beforeEach(() => {
  rows = [];
  nextId = 1;
  jest.clearAllMocks();
});

describe('getRefRegisteredOverrides', () => {
  test('저장된 행을 그대로 반환한다', async () => {
    rows = [{ id: 1, menuName: '석쇠' }];
    expect(await getRefRegisteredOverrides()).toEqual([{ id: 1, menuName: '석쇠' }]);
  });
});

describe('addRefRegisteredOverride', () => {
  test('menuName을 저장한다', async () => {
    await addRefRegisteredOverride({ menuName: '석쇠' });
    expect(rows).toHaveLength(1);
    expect(rows[0].menuName).toBe('석쇠');
  });

  test('이미 등록된(정규화 후 동일) menuName이면 에러를 던진다', async () => {
    rows = [{ id: 1, menuName: '석 쇠' }];
    await expect(addRefRegisteredOverride({ menuName: '석쇠' })).rejects.toThrow(
      '이미 해제된 메뉴입니다'
    );
  });

  test('menuName이 비어있으면 에러를 던진다', async () => {
    await expect(addRefRegisteredOverride({ menuName: '  ' })).rejects.toThrow(
      'menuName은 필수입니다'
    );
  });

  test('assertActiveAdmin을 호출한다', async () => {
    await addRefRegisteredOverride({ menuName: '석쇠' });
    expect(assertActiveAdmin).toHaveBeenCalledWith('미등록 판정 해제');
  });
});

describe('deleteRefRegisteredOverrideByName', () => {
  test('정규화 후 일치하는 행을 찾아 삭제한다', async () => {
    rows = [{ id: 1, menuName: '석 쇠' }];
    const result = await deleteRefRegisteredOverrideByName('석쇠');
    expect(result).toEqual({ deleted: true });
    expect(rows).toEqual([]);
  });

  test('일치하는 행이 없으면 아무것도 지우지 않고 deleted:false를 반환한다', async () => {
    rows = [{ id: 1, menuName: 'A' }];
    const result = await deleteRefRegisteredOverrideByName('없는이름');
    expect(result).toEqual({ deleted: false });
    expect(rows).toHaveLength(1);
  });

  test('assertActiveAdmin을 호출한다', async () => {
    rows = [{ id: 1, menuName: 'A' }];
    await deleteRefRegisteredOverrideByName('A');
    expect(assertActiveAdmin).toHaveBeenCalledWith('미등록 판정 복원');
  });
});

describe('미등록 판정 해제 → 복원 왕복', () => {
  test('추가 후 이름으로 삭제하면 다시 추가할 수 있다', async () => {
    await addRefRegisteredOverride({ menuName: '석쇠' });
    expect(await getRefRegisteredOverrides()).toHaveLength(1);

    await deleteRefRegisteredOverrideByName('석쇠');
    expect(await getRefRegisteredOverrides()).toHaveLength(0);

    await addRefRegisteredOverride({ menuName: '석쇠' });
    expect(await getRefRegisteredOverrides()).toHaveLength(1);
  });
});
