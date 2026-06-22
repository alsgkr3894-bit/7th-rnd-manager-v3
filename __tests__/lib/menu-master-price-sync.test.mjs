import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let stores = {};
let nextId = 1;

function rows(storeName) {
  return (stores[storeName] ??= []);
}

function makeObjectStore(storeName) {
  return {
    add(record) {
      const id = record.id ?? nextId++;
      rows(storeName).push({ ...record, id });
      return { result: id };
    },
    put(record) {
      const idx = rows(storeName).findIndex(r => r.id === record.id);
      if (idx >= 0) rows(storeName)[idx] = record;
      else rows(storeName).push(record);
    },
    delete(id) {
      stores[storeName] = rows(storeName).filter(r => r.id !== id);
    },
  };
}

const runTransaction = jest.fn((storeNames, mode, work) => {
  const allowed = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = {
    objectStore(storeName) {
      if (!allowed.includes(storeName)) throw new Error(`unexpected store: ${storeName}`);
      return makeObjectStore(storeName);
    },
  };
  work(tx);
  return Promise.resolve();
});
const assertActiveAdmin = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(storeName => storeName in stores),
  getAll: jest.fn(storeName => Promise.resolve([...rows(storeName)])),
  getByIndex: jest.fn((storeName, indexName, value) =>
    Promise.resolve(rows(storeName).filter(row => row[indexName] === value))
  ),
  put: jest.fn((storeName, record) => {
    const id = record.id ?? nextId++;
    const next = { ...record, id };
    const idx = rows(storeName).findIndex(row => row.id === id);
    if (idx >= 0) rows(storeName)[idx] = next;
    else rows(storeName).push(next);
    return Promise.resolve(id);
  }),
  deleteById: jest.fn((storeName, id) => {
    stores[storeName] = rows(storeName).filter(row => row.id !== id);
    return Promise.resolve();
  }),
  runTransaction,
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin,
}));

const { getAllMenuMaster, pushMasterToPrices, syncMenuMasterFromPrices } =
  await import('../../lib/menu-master/index.js');

describe('menu master price sync policy', () => {
  beforeEach(() => {
    nextId = 100;
    runTransaction.mockClear();
    assertActiveAdmin.mockReset();
    assertActiveAdmin.mockResolvedValue();
    stores = {
      menu_master: [],
      cost_selling_prices: [],
    };
  });

  test('판매가 동기화는 기존 메뉴마스터의 식별/운영 필드를 덮지 않고 가격만 갱신한다', async () => {
    stores.menu_master = [
      {
        id: 1,
        menuCode: 'PZ-001-L',
        menuName: '마스터 피자',
        category: '피자/오리지널',
        subCategory: '오리지널',
        size: 'L',
        price: 19000,
        status: 'test',
        source: 'manual',
        displayOrder: 9,
        note: '운영 메모',
        hidden: true,
        excludeFromOrigin: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = await syncMenuMasterFromPrices([
      {
        menuCode: 'PZ-001-L',
        menuName: '업로드 피자명',
        category: '사이드',
        size: 'R',
        price: '21000',
        note: '업로드 메모',
      },
    ]);

    expect(result).toMatchObject({
      synced: 1,
      created: 0,
      priceUpdated: 1,
      unchanged: 0,
      duplicateMenuCodes: [],
    });
    expect(stores.menu_master[0]).toMatchObject({
      id: 1,
      menuCode: 'PZ-001-L',
      menuName: '마스터 피자',
      category: '피자/오리지널',
      subCategory: '오리지널',
      size: 'L',
      price: 21000,
      status: 'test',
      source: 'manual',
      displayOrder: 9,
      note: '운영 메모',
      hidden: true,
      excludeFromOrigin: true,
    });
  });

  test('메뉴마스터 조회는 같은 메뉴의 규격을 L 다음 R 순서로 정렬한다', async () => {
    stores.menu_master = [
      {
        id: 1,
        menuCode: 'P-OR-001-R',
        menuName: '정렬 피자',
        category: '피자',
        size: 'R',
        displayOrder: 3010,
      },
      {
        id: 2,
        menuCode: 'P-OR-001-L',
        menuName: '정렬 피자',
        category: '피자',
        size: 'L',
        displayOrder: 3011,
      },
      {
        id: 3,
        menuCode: 'P-OR-002-R',
        menuName: '다음 피자',
        category: '피자',
        size: 'R',
        displayOrder: 3020,
      },
      {
        id: 4,
        menuCode: 'P-OR-002-L',
        menuName: '다음 피자',
        category: '피자',
        size: 'L',
        displayOrder: 3021,
      },
    ];

    await expect(getAllMenuMaster()).resolves.toEqual([
      expect.objectContaining({ menuCode: 'P-OR-001-L', size: 'L' }),
      expect.objectContaining({ menuCode: 'P-OR-001-R', size: 'R' }),
      expect.objectContaining({ menuCode: 'P-OR-002-L', size: 'L' }),
      expect.objectContaining({ menuCode: 'P-OR-002-R', size: 'R' }),
    ]);
  });

  test('신규 판매가 코드는 메뉴마스터에 price-sync 출처로 생성한다', async () => {
    const result = await syncMenuMasterFromPrices([
      {
        menuCode: 'PZ-002-R',
        menuName: '신규 피자',
        category: '피자',
        size: 'R',
        price: 17000,
      },
    ]);

    expect(result).toMatchObject({
      synced: 1,
      created: 1,
      priceUpdated: 0,
      unchanged: 0,
      duplicateMenuCodes: [],
    });
    expect(stores.menu_master).toHaveLength(1);
    expect(stores.menu_master[0]).toMatchObject({
      menuCode: 'PZ-002-R',
      menuName: '신규 피자',
      category: '피자',
      size: 'R',
      price: 17000,
      status: 'active',
      source: 'price-sync',
      displayOrder: 0,
      note: '',
    });
  });

  test('판매가 입력의 중복 menuCode는 마지막 값만 반영하고 결과에 진단한다', async () => {
    const result = await syncMenuMasterFromPrices([
      {
        menuCode: 'PZ-003-L',
        menuName: '첫 번째 행',
        category: '피자',
        size: 'L',
        price: 18000,
      },
      {
        menuCode: 'PZ-003-L',
        menuName: '마지막 행',
        category: '피자',
        size: 'L',
        price: 19000,
      },
    ]);

    expect(result.duplicateMenuCodes).toEqual(['PZ-003-L']);
    expect(stores.menu_master).toHaveLength(1);
    expect(stores.menu_master[0]).toMatchObject({
      menuCode: 'PZ-003-L',
      menuName: '마지막 행',
      price: 19000,
    });
  });

  test('판매가 동기화는 잘못된 가격 문자열을 NaN 대신 null로 저장한다', async () => {
    const result = await syncMenuMasterFromPrices([
      {
        menuCode: 'PZ-009-L',
        menuName: '가격 오류 피자',
        category: '피자',
        size: 'L',
        price: 'bad',
      },
    ]);

    expect(result).toMatchObject({ synced: 1, created: 1 });
    expect(stores.menu_master[0]).toMatchObject({
      menuCode: 'PZ-009-L',
      price: null,
    });
  });

  test('판매가 동기화는 음수 가격을 null로 저장한다', async () => {
    const result = await syncMenuMasterFromPrices([
      {
        menuCode: 'PZ-010-L',
        menuName: '음수 가격 피자',
        category: '피자',
        size: 'L',
        price: -1000,
      },
    ]);

    expect(result).toMatchObject({ synced: 1, created: 1 });
    expect(stores.menu_master[0]).toMatchObject({
      menuCode: 'PZ-010-L',
      price: null,
    });
  });

  test('메뉴마스터 push는 discontinued 메뉴를 판매가 mirror에서 제거한다', async () => {
    stores.menu_master = [
      {
        id: 1,
        menuCode: 'PZ-004-L',
        menuName: '단종 피자',
        category: '피자',
        size: 'L',
        price: 20000,
        status: 'discontinued',
      },
    ];
    stores.cost_selling_prices = [
      { id: 10, menuCode: 'PZ-004-L', menuName: '단종 피자', price: 20000 },
      { id: 11, menuCode: 'PZ-005-L', menuName: '유지 피자', price: 21000 },
    ];

    const result = await pushMasterToPrices();

    expect(result).toEqual({ pushed: 0, removed: 1 });
    expect(stores.cost_selling_prices).toEqual([
      { id: 11, menuCode: 'PZ-005-L', menuName: '유지 피자', price: 21000 },
    ]);
  });
});
