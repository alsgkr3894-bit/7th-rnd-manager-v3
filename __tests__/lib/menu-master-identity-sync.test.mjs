/**
 * S4: 메뉴마스터에서 menuCode는 그대로 두고 menuName/category만 바꿨을 때
 * nutrition_menu_ref 등 연결 store에 자동 전파되는지(collectIdentitySyncRows).
 * 이걸 안 하면 영양성분표·원산지·알레르기 화면에 옛 이름이 계속 나온다(감사 기록 D4/S4).
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let stores = {};

function storeRows(name) {
  return (stores[name] ??= []);
}

function dbGetAll(name) {
  return Promise.resolve([...storeRows(name)]);
}

function dbHasStore(name) {
  return name in stores;
}

let pendingGetAll = [];

function makeObjectStore(storeName) {
  return {
    delete(id) {
      stores[storeName] = stores[storeName].filter(r => r.id !== id);
    },
    put(record) {
      const idx = stores[storeName].findIndex(r => r.id === record.id);
      if (idx >= 0) stores[storeName][idx] = record;
      else stores[storeName].push(record);
    },
    add(record) {
      const nextId = (Math.max(0, ...stores[storeName].map(r => r.id || 0)) || 0) + 1;
      stores[storeName].push({ ...record, id: nextId });
      return nextId;
    },
    getAll() {
      const req = { result: [...storeRows(storeName)], onsuccess: null, onerror: null };
      pendingGetAll.push(req);
      return req;
    },
  };
}

function dbRunTransaction(storeNames, mode, work) {
  const nameList = Array.isArray(storeNames) ? storeNames : [storeNames];
  pendingGetAll = [];
  const tx = {
    objectStore(name) {
      if (!nameList.includes(name)) throw new Error(`unexpected store: ${name}`);
      return makeObjectStore(name);
    },
  };
  work(tx);
  while (pendingGetAll.length) {
    const req = pendingGetAll.shift();
    req.onsuccess?.();
  }
  return Promise.resolve();
}

jest.unstable_mockModule('@/lib/db', () => ({
  hasStore: jest.fn(name => dbHasStore(name)),
  getAll: jest.fn(name => dbGetAll(name)),
  getByIndex: jest.fn((store, index, value) =>
    Promise.resolve(storeRows(store).filter(r => r[index] === value))
  ),
  runTransaction: jest.fn((storeNames, mode, work) => dbRunTransaction(storeNames, mode, work)),
  put: jest.fn((storeName, record) => {
    storeRows(storeName).push(record);
    return Promise.resolve();
  }),
  deleteById: jest.fn((storeName, id) => {
    stores[storeName] = stores[storeName].filter(r => r.id !== id);
    return Promise.resolve();
  }),
}));

jest.unstable_mockModule('@/lib/work-log', () => ({
  logWork: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: () => 'main',
}));

const { upsertMenuMaster } = await import('../../lib/menu-master/store.js');

// 코드 접두사 'X-'는 parseCategoryFromCode가 인식하지 못해 category가 buildRecord에서
// 그대로 통과된다(피자 등 인식되는 접두사는 category를 코드에서 재계산해 덮어써 버려서,
// 이 테스트가 검증하려는 "category만 바뀌는 경우"를 만들 수 없다).
describe('upsertMenuMaster — 이름/카테고리만 바뀐 경우 연결 store 전파 (S4)', () => {
  beforeEach(() => {
    stores = {
      menu_master: [
        { id: 1, menuCode: 'X-OR-001-L', menuName: '오리지널피자', category: '피자', size: 'L' },
        { id: 2, menuCode: 'X-OR-001-R', menuName: '오리지널피자', category: '피자', size: 'R' },
      ],
      nutrition_menu_ref: [{ id: 10, menuCode: 'X-OR-001', menuName: '오리지널피자' }],
      cost_selling_prices: [
        { id: 20, menuCode: 'X-OR-001-L', menuName: '오리지널피자', price: 9900 },
      ],
      menu_recipes: [
        {
          id: 30,
          menuCode: 'X-OR-001-L',
          menuName: '오리지널피자',
          category: '피자',
          kind: 'pizza',
        },
      ],
      menu_recipe_versions: [
        { id: 40, menuCode: 'X-OR-001-L', menuName: '오리지널피자', savedAt: '2026-01-01' },
      ],
    };
  });

  test('menuCode는 그대로 두고 이름만 바꾸면 nutrition_menu_ref의 menuName도 새로고침된다', async () => {
    const result = await upsertMenuMaster({
      id: 1,
      menuCode: 'X-OR-001-L',
      menuName: '오리지널피자(리뉴얼)',
      category: '피자',
      size: 'L',
    });

    expect(result.cascadedMenuCode).toBeNull();
    expect(result.cascadedIdentity).toEqual({
      updated: expect.objectContaining({ nutrition_menu_ref: 1 }),
    });
    expect(stores.nutrition_menu_ref[0].menuName).toBe('오리지널피자(리뉴얼)');
  });

  test('base 코드를 공유하는 형제 규격(L)의 이름만 바꿔도 nutrition_menu_ref(base) 1건이 갱신된다', async () => {
    await upsertMenuMaster({
      id: 1,
      menuCode: 'X-OR-001-L',
      menuName: '오리지널피자 NEW',
      category: '피자',
      size: 'L',
    });

    // R(id:2)은 건드리지 않았으므로 menu_master 자체는 그대로다.
    expect(stores.menu_master.find(r => r.id === 2).menuName).toBe('오리지널피자');
    // 하지만 base 코드로 묶인 영양 메뉴는 L의 새 이름을 따라간다(영양 메뉴는 L/R 공용 1건).
    expect(stores.nutrition_menu_ref[0].menuName).toBe('오리지널피자 NEW');
  });

  test('full 코드 store(판매가·레시피)도 같은 코드 행만 새로고침되고, 이력(append-only)은 건드리지 않는다', async () => {
    await upsertMenuMaster({
      id: 1,
      menuCode: 'X-OR-001-L',
      menuName: '오리지널피자 NEW',
      category: '사이드', // category도 같이 바뀌는 경우
      size: 'L',
    });

    expect(stores.cost_selling_prices[0].menuName).toBe('오리지널피자 NEW');
    const recipe = stores.menu_recipes[0];
    expect(recipe.menuName).toBe('오리지널피자 NEW');
    expect(recipe.category).toBe('사이드');
    // 이력은 append-only라 옛 이름 그대로 남아야 한다(과거 시점 기록 보존).
    expect(stores.menu_recipe_versions[0].menuName).toBe('오리지널피자');
  });

  test('이름/카테고리가 안 바뀌면(가격만 수정) 연결 store 전파가 일어나지 않는다', async () => {
    const result = await upsertMenuMaster({
      id: 1,
      menuCode: 'X-OR-001-L',
      menuName: '오리지널피자',
      category: '피자',
      size: 'L',
      price: 12000,
    });

    expect(result.cascadedIdentity).toBeNull();
    expect(stores.nutrition_menu_ref[0].menuName).toBe('오리지널피자');
  });

  test('menuCode 자체가 바뀌는 경우는 기존 코드-이동 캐스케이드가 그대로 담당한다(중복 실행 없음)', async () => {
    const result = await upsertMenuMaster({
      id: 1,
      menuCode: 'X-OR-002-L',
      menuName: '오리지널피자 NEW',
      category: '피자',
      size: 'L',
    });

    expect(result.cascadedMenuCode).toMatchObject({ from: 'X-OR-001-L', to: 'X-OR-002-L' });
    expect(result.cascadedIdentity).toBeNull();
  });
});
