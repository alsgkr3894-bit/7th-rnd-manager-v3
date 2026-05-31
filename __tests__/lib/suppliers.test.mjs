/**
 * Unit tests for lib/cost/suppliers/store.js
 *
 * DB를 mock하여 실제 IndexedDB 없이 store 함수의 로직을 검증합니다.
 */

import { jest } from '@jest/globals';

// ── DB mock 설정 ───────────────────────────────────────────────
let _store = [];
let _nextId = 1;

const dbMock = {
  getAll: jest.fn(async () => [..._store]),
  put: jest.fn(async (_storeName, record) => {
    const idx = _store.findIndex(r => r.id === record.id);
    if (idx >= 0) { _store[idx] = record; } else { _store.push(record); }
    return record.id;
  }),
  deleteById: jest.fn(async (_storeName, id) => {
    _store = _store.filter(r => r.id !== id);
  }),
  hasStore: jest.fn(() => true),
  runTransaction: jest.fn(async (_stores, _mode, cb) => {
    // 간단한 mock: objectStore add/put를 직접 처리
    const objectStore = {
      add(record) {
        const id = _nextId++;
        const saved = { ...record, id };
        _store.push(saved);
        const req = { result: id, onsuccess: null };
        // onsuccess 를 동기적으로 호출
        Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      put(record) {
        const idx = _store.findIndex(r => r.id === record.id);
        if (idx >= 0) { _store[idx] = record; } else { _store.push(record); }
        return { result: record.id };
      },
    };
    cb({ objectStore: () => objectStore });
    // runTransaction이 Promise를 반환한다고 가정 — 짧게 flush
    await new Promise(r => setTimeout(r, 5));
  }),
};

jest.unstable_mockModule('@/lib/db', () => dbMock);

// ── store import (mock 이후) ───────────────────────────────────
const { getAllSuppliers, addSupplier, updateSupplier, deleteSupplier } =
  await import('@/lib/cost/suppliers/store');

// ── 각 테스트 전 초기화 ───────────────────────────────────────
beforeEach(() => {
  _store = [];
  _nextId = 1;
  jest.clearAllMocks();
  // hasStore는 항상 true 반환
  dbMock.hasStore.mockReturnValue(true);
  // getAll은 현재 _store 반환
  dbMock.getAll.mockImplementation(async () => [..._store]);
});

// ── 테스트 ────────────────────────────────────────────────────

describe('getAllSuppliers', () => {
  test('빈 store이면 빈 배열 반환', async () => {
    const result = await getAllSuppliers();
    expect(result).toEqual([]);
  });

  test('hasStore가 false이면 빈 배열 반환 (안전 처리)', async () => {
    dbMock.hasStore.mockReturnValue(false);
    const result = await getAllSuppliers();
    expect(result).toEqual([]);
    expect(dbMock.getAll).not.toHaveBeenCalled();
  });

  test('이름순 정렬', async () => {
    _store = [
      { id: 1, name: '청과물', contact: null, phone: null, memo: null },
      { id: 2, name: '나물나라', contact: null, phone: null, memo: null },
      { id: 3, name: '가락시장', contact: null, phone: null, memo: null },
    ];
    const result = await getAllSuppliers();
    expect(result.map(s => s.name)).toEqual(['가락시장', '나물나라', '청과물']);
  });
});

describe('addSupplier', () => {
  test('새 레코드 추가 후 id 반환', async () => {
    const id = await addSupplier({ name: '대림수산', contact: '홍길동', phone: '010-1234-5678', memo: '테스트' });
    expect(typeof id).toBe('number');
    expect(_store).toHaveLength(1);
    expect(_store[0].name).toBe('대림수산');
    expect(_store[0].contact).toBe('홍길동');
  });

  test('빈 contact/phone/memo는 null로 저장', async () => {
    await addSupplier({ name: '이마트' });
    expect(_store[0].contact).toBeNull();
    expect(_store[0].phone).toBeNull();
    expect(_store[0].memo).toBeNull();
  });

  test('name 공백 trim', async () => {
    await addSupplier({ name: '  롯데슈퍼  ' });
    expect(_store[0].name).toBe('롯데슈퍼');
  });

  test('createdAt, updatedAt이 ISO string으로 저장됨', async () => {
    await addSupplier({ name: '테스트' });
    expect(_store[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(_store[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('hasStore가 false이면 에러 throw', async () => {
    dbMock.hasStore.mockReturnValue(false);
    await expect(addSupplier({ name: '테스트' })).rejects.toThrow('cost_suppliers store 없음');
  });
});

describe('updateSupplier', () => {
  test('기존 레코드 수정', async () => {
    _store = [{ id: 1, name: '구공급사', contact: null, phone: null, memo: null, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }];
    await updateSupplier(1, { name: '신공급사', contact: '김철수' });
    expect(_store[0].name).toBe('신공급사');
    expect(_store[0].contact).toBe('김철수');
  });

  test('존재하지 않는 id이면 에러 throw', async () => {
    await expect(updateSupplier(999, { name: '없는업체' })).rejects.toThrow('공급업체를 찾을 수 없습니다');
  });

  test('updatedAt이 갱신됨', async () => {
    const oldDate = '2020-01-01T00:00:00.000Z';
    _store = [{ id: 1, name: '테스트', contact: null, phone: null, memo: null, createdAt: oldDate, updatedAt: oldDate }];
    await updateSupplier(1, { name: '수정됨' });
    expect(_store[0].updatedAt).not.toBe(oldDate);
  });
});

describe('deleteSupplier', () => {
  test('deleteById 호출', async () => {
    dbMock.deleteById.mockResolvedValue(undefined);
    await deleteSupplier(42);
    expect(dbMock.deleteById).toHaveBeenCalledWith('cost_suppliers', 42);
  });

  test('hasStore가 false이면 에러 throw', async () => {
    dbMock.hasStore.mockReturnValue(false);
    await expect(deleteSupplier(1)).rejects.toThrow('cost_suppliers store 없음');
  });
});
