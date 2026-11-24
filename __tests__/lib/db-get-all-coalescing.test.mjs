import { jest } from '@jest/globals';

const requests = [];
const getAllMock = jest.fn(() => {
  const request = { result: [], error: null, onsuccess: null, onerror: null };
  requests.push(request);
  return request;
});
const db = {
  transaction: jest.fn(() => ({
    objectStore: () => ({ getAll: getAllMock }),
  })),
  objectStoreNames: { contains: () => true },
};

jest.unstable_mockModule('../../lib/db/init.js', () => ({
  _getDB: () => db,
  forgetHandle: jest.fn(),
}));
jest.unstable_mockModule('../../lib/db/server-sync.js', () => ({
  captureStoreRequest: jest.fn(),
  queueCapturedStoreSync: jest.fn(),
  queueStoreClear: jest.fn(),
  queueStoreRowDelete: jest.fn(),
  queueStoreRowUpsert: jest.fn(),
  wrapTransactionForServerSync: tx => tx,
}));

const { getAll } = await import('../../lib/db/crud.js');

describe('getAll 동시 조회 병합', () => {
  beforeEach(() => {
    requests.length = 0;
    getAllMock.mockClear();
    db.transaction.mockClear();
  });

  test('동일 저장소의 진행 중인 요청을 공유하고 완료 후에는 새로 조회한다', async () => {
    const first = getAll('cost_ingredients');
    const second = getAll('cost_ingredients');

    expect(first).toBe(second);
    expect(getAllMock).toHaveBeenCalledTimes(1);

    requests[0].result = [{ id: 1 }];
    requests[0].onsuccess();
    await expect(first).resolves.toEqual([{ id: 1 }]);
    await Promise.resolve();

    const third = getAll('cost_ingredients');
    expect(third).not.toBe(first);
    expect(getAllMock).toHaveBeenCalledTimes(2);
    requests[1].result = [{ id: 2 }];
    requests[1].onsuccess();
    await expect(third).resolves.toEqual([{ id: 2 }]);
  });

  test('서로 다른 저장소는 별도로 조회한다', () => {
    const ingredients = getAll('cost_ingredients');
    const recipes = getAll('menu_recipes');

    expect(ingredients).not.toBe(recipes);
    expect(getAllMock).toHaveBeenCalledTimes(2);
    requests[0].onsuccess();
    requests[1].onsuccess();
  });
});
