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
      const id = record.id ?? nextId++;
      const next = { ...record, id };
      const idx = rows(storeName).findIndex(row => row.id === id);
      if (idx >= 0) rows(storeName)[idx] = next;
      else rows(storeName).push(next);
    },
    delete(id) {
      stores[storeName] = rows(storeName).filter(row => row.id !== id);
    },
    clear() {
      stores[storeName] = [];
    },
  };
}

const syncMenuMasterFromPrices = jest.fn();
const assertActiveAdmin = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(storeName => storeName in stores),
  getAll: jest.fn(storeName => Promise.resolve([...rows(storeName)])),
  runTransaction: jest.fn((storeNames, mode, work) => {
    const allowed = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = {
      objectStore(storeName) {
        if (!allowed.includes(storeName)) throw new Error(`unexpected store: ${storeName}`);
        return makeObjectStore(storeName);
      },
    };
    work(tx);
    return Promise.resolve();
  }),
}));

jest.unstable_mockModule('@/lib/menu-master', () => ({
  syncMenuMasterFromPrices,
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin,
}));

const { previewMenuPriceReplacement, replaceAllMenuPrices } =
  await import('../../lib/cost/menu-price/store.js');

describe('menu price store safety', () => {
  beforeEach(() => {
    nextId = 100;
    stores = {
      cost_selling_prices: [
        { id: 1, menuCode: 'P-OR-001-L', menuName: '기존 피자', price: 21000 },
        { id: 2, menuCode: 'S-CHK-001', menuName: '기존 사이드', price: 7000 },
        { id: 3, menuCode: '', menuName: '레거시 무코드', price: 1000 },
      ],
    };
    syncMenuMasterFromPrices.mockReset();
    syncMenuMasterFromPrices.mockResolvedValue({
      synced: 1,
      created: 0,
      priceUpdated: 1,
      unchanged: 0,
      duplicateMenuCodes: [],
    });
    assertActiveAdmin.mockReset();
    assertActiveAdmin.mockResolvedValue();
  });

  test('전체교체 미리보기는 유지·신규·삭제 예상 건수를 계산한다', async () => {
    const impact = await previewMenuPriceReplacement([
      { menuCode: 'P-OR-001-L', menuName: '기존 피자', category: '피자', size: 'L', price: 22000 },
      {
        menuCode: 'D-CC-001-355',
        menuName: '신규 음료',
        category: '음료',
        size: '355',
        price: 2000,
      },
    ]);

    expect(impact).toEqual({
      existing: 3,
      replacement: 2,
      retained: 1,
      created: 1,
      removed: 2,
    });
  });

  test('전체교체 후 메뉴마스터 동기화 실패를 저장 성공 결과와 분리해 반환한다', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    syncMenuMasterFromPrices.mockRejectedValueOnce(new Error('index blocked'));

    const result = await replaceAllMenuPrices([
      { menuCode: 'P-OR-001-L', menuName: '기존 피자', category: '피자', size: 'L', price: 23000 },
    ]);

    expect(result.replaced).toBe(1);
    expect(result.sync.error).toContain('index blocked');
    expect(stores.cost_selling_prices).toEqual([
      expect.objectContaining({ menuCode: 'P-OR-001-L', price: 23000 }),
    ]);
    expect(assertActiveAdmin).toHaveBeenCalledWith('판매가 일괄 교체');
    errorSpy.mockRestore();
  });

  test('판매가 전체교체는 잘못된 가격 문자열을 NaN 대신 null로 저장한다', async () => {
    await replaceAllMenuPrices([
      {
        menuCode: 'P-OR-002-L',
        menuName: '숫자 오류 피자',
        category: '피자',
        size: 'L',
        price: 'bad',
      },
    ]);

    expect(stores.cost_selling_prices).toEqual([
      expect.objectContaining({ menuCode: 'P-OR-002-L', price: null }),
    ]);
  });

  test('판매가 전체교체는 음수 가격을 null로 저장한다', async () => {
    await replaceAllMenuPrices([
      {
        menuCode: 'P-OR-003-L',
        menuName: '음수 가격 피자',
        category: '피자',
        size: 'L',
        price: -1000,
      },
    ]);

    expect(stores.cost_selling_prices).toEqual([
      expect.objectContaining({ menuCode: 'P-OR-003-L', price: null }),
    ]);
  });
});
