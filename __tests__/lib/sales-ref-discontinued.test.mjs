/**
 * 비정규메뉴 단종 처리(ref_discontinued) CRUD 단위 테스트.
 * getRefDiscontinued / addRefDiscontinued / deleteRefDiscontinued / deleteRefDiscontinuedByName
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
    if (storeName === 'ref_discontinued') return Promise.resolve([...rows]);
    return Promise.resolve([]);
  }),
  runTransaction: jest.fn((_storeNames, _mode, work) => {
    const tx = {
      objectStore(storeName) {
        if (storeName !== 'ref_discontinued') throw new Error(`unexpected store: ${storeName}`);
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
const {
  getRefDiscontinued,
  addRefDiscontinued,
  deleteRefDiscontinued,
  deleteRefDiscontinuedByName,
} = await import('../../lib/sales/store-user-rules.js');

beforeEach(() => {
  rows = [];
  nextId = 1;
  jest.clearAllMocks();
});

describe('getRefDiscontinued', () => {
  test('저장된 행을 그대로 반환한다', async () => {
    rows = [{ id: 1, menuName: '깜짝세트' }];
    expect(await getRefDiscontinued()).toEqual([{ id: 1, menuName: '깜짝세트' }]);
  });
});

describe('addRefDiscontinued', () => {
  test('menuName을 저장한다', async () => {
    await addRefDiscontinued({ menuName: '깜짝세트' });
    expect(rows).toHaveLength(1);
    expect(rows[0].menuName).toBe('깜짝세트');
  });

  test('이미 등록된(정규화 후 동일) menuName이면 에러를 던진다', async () => {
    rows = [{ id: 1, menuName: '깜짝 세트' }];
    await expect(addRefDiscontinued({ menuName: '깜짝세트' })).rejects.toThrow(
      '이미 단종 처리된 메뉴입니다'
    );
  });

  test('menuName이 비어있으면 에러를 던진다', async () => {
    await expect(addRefDiscontinued({ menuName: '  ' })).rejects.toThrow('menuName은 필수입니다');
  });

  test('assertActiveAdmin을 호출한다', async () => {
    await addRefDiscontinued({ menuName: '깜짝세트' });
    expect(assertActiveAdmin).toHaveBeenCalledWith('비정규메뉴 단종 처리');
  });
});

describe('deleteRefDiscontinued', () => {
  test('id로 삭제한다', async () => {
    rows = [
      { id: 1, menuName: 'A' },
      { id: 2, menuName: 'B' },
    ];
    await deleteRefDiscontinued(1);
    expect(rows.map(r => r.id)).toEqual([2]);
  });
});

describe('deleteRefDiscontinuedByName', () => {
  test('정규화 후 일치하는 행을 찾아 삭제한다', async () => {
    rows = [{ id: 1, menuName: '깜짝 세트' }];
    const result = await deleteRefDiscontinuedByName('깜짝세트');
    expect(result).toEqual({ deleted: true });
    expect(rows).toEqual([]);
  });

  test('일치하는 행이 없으면 아무것도 지우지 않고 deleted:false를 반환한다', async () => {
    rows = [{ id: 1, menuName: 'A' }];
    const result = await deleteRefDiscontinuedByName('없는이름');
    expect(result).toEqual({ deleted: false });
    expect(rows).toHaveLength(1);
  });

  test('assertActiveAdmin을 호출한다', async () => {
    rows = [{ id: 1, menuName: 'A' }];
    await deleteRefDiscontinuedByName('A');
    expect(assertActiveAdmin).toHaveBeenCalledWith('비정규메뉴 단종 처리 해제');
  });
});

describe('단종 처리 → 해제 왕복', () => {
  test('추가 후 이름으로 해제하면 다시 추가할 수 있다', async () => {
    await addRefDiscontinued({ menuName: '깜짝세트' });
    expect(await getRefDiscontinued()).toHaveLength(1);

    await deleteRefDiscontinuedByName('깜짝세트');
    expect(await getRefDiscontinued()).toHaveLength(0);

    await addRefDiscontinued({ menuName: '깜짝세트' });
    expect(await getRefDiscontinued()).toHaveLength(1);
  });
});
