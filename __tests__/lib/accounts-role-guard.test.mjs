/**
 * 계정 파괴적 함수의 권한 가드 통합 동작 테스트.
 * guard/getActiveRole을 모킹하지 않고 실제 경로를 태워, accounts→guard 동적 import
 * 순환이 런타임에 정상 동작하는지(viewer 차단/admin 통과)까지 함께 검증한다.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

let activeBrandId = 'main';

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: () => activeBrandId,
}));

const dbMock = {
  getAll: jest.fn(),
  put: jest.fn(),
  deleteById: jest.fn(),
  hasStore: jest.fn(() => true),
};
jest.unstable_mockModule('@/lib/db', () => dbMock);

const { addAccount, deleteAccount, updateAccount, activeAccountKeyForBrand } =
  await import('../../lib/auth/accounts.js');

const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;

function installStorage(initial = {}) {
  const store = { ...initial };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent() {} },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: key => {
        delete store[key];
      },
    },
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

describe('계정 파괴 함수 권한 가드', () => {
  beforeEach(() => {
    activeBrandId = 'main';
    jest.clearAllMocks();
    dbMock.hasStore.mockReturnValue(true);
  });

  test('viewer 활성 계정이면 deleteAccount가 차단되고 deleteById 미호출', async () => {
    dbMock.getAll.mockResolvedValue([
      { id: 1, role: 'admin' },
      { id: 2, role: 'viewer' },
    ]);
    installStorage({ [activeAccountKeyForBrand('main')]: '2' });

    await expect(deleteAccount(2)).rejects.toThrow(/관리자만/);
    expect(dbMock.deleteById).not.toHaveBeenCalled();
  });

  test('viewer 활성 계정이면 addAccount/updateAccount도 차단', async () => {
    dbMock.getAll.mockResolvedValue([
      { id: 1, role: 'admin' },
      { id: 2, role: 'viewer' },
    ]);
    installStorage({ [activeAccountKeyForBrand('main')]: '2' });

    await expect(addAccount({ name: 'x', role: 'viewer' })).rejects.toThrow(/관리자만/);
    await expect(updateAccount({ id: 1, name: 'y' })).rejects.toThrow(/관리자만/);
    expect(dbMock.put).not.toHaveBeenCalled();
  });

  test('admin 활성 계정이면 deleteAccount가 통과되어 deleteById 호출', async () => {
    dbMock.getAll.mockResolvedValue([
      { id: 1, role: 'admin' },
      { id: 2, role: 'viewer' },
    ]);
    installStorage({ [activeAccountKeyForBrand('main')]: '1' });

    await deleteAccount(2);
    expect(dbMock.deleteById).toHaveBeenCalledWith('ref_accounts', 2);
  });

  test('계정 0개(신규설치)면 admin 기본값으로 addAccount 통과', async () => {
    dbMock.getAll.mockResolvedValue([]);
    installStorage();

    await addAccount({ name: '관리자', role: 'admin' });
    expect(dbMock.put).toHaveBeenCalled();
  });
});
