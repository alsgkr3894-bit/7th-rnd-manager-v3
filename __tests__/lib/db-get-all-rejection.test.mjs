import { describe, expect, jest, test } from '@jest/globals';

// 2026-11-26: 중복 조회 합치기의 finally()가 실패를 한 번 더 던져, 호출부가 처리해도
// 브라우저에 "처리되지 않은 오류"가 남았다.
let fail = true;
const db = {
  transaction() {
    if (fail) throw new Error('읽기 실패');
    return {
      objectStore: () => ({
        getAll() {
          const request = { result: [1] };
          queueMicrotask(() => request.onsuccess());
          return request;
        },
      }),
    };
  },
};
jest.unstable_mockModule('../../lib/db/init.js', () => ({
  _getDB: () => db,
  forgetHandle: () => {},
}));
jest.unstable_mockModule('../../lib/db/server-sync.js', () => ({
  captureStoreRequest: () => {},
  queueCapturedStoreSync: () => {},
  queueStoreClear: () => {},
  queueStoreRowDelete: () => {},
  queueStoreRowUpsert: () => {},
  wrapTransactionForServerSync: tx => tx,
}));

const { getAll } = await import('../../lib/db/crud.js');

describe('getAll 실패', () => {
  test('호출부가 처리하면 남는 거부가 없고, 다음 호출은 다시 읽는다', async () => {
    const unhandled = [];
    const record = reason => unhandled.push(reason);
    process.on('unhandledRejection', record);
    try {
      await expect(getAll('menu_master')).rejects.toThrow('읽기 실패');
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(unhandled).toEqual([]);
      fail = false;
      await expect(getAll('menu_master')).resolves.toEqual([1]);
    } finally {
      process.off('unhandledRejection', record);
    }
  });
});
