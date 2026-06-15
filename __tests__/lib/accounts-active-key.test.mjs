import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

let activeBrandId = 'brand-b';

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: () => activeBrandId,
}));

jest.unstable_mockModule('@/lib/db', () => ({
  getAll: jest.fn(),
  put: jest.fn(),
  deleteById: jest.fn(),
  hasStore: jest.fn(() => true),
}));

const {
  ACTIVE_ACCOUNT_KEY,
  activeAccountKeyForBrand,
  getActiveAccountId,
  getActiveAccountStorageKey,
  isActiveAccountStorageKey,
  setActiveAccountId,
} = await import('../../lib/auth/accounts.js');

const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

function installStorage(initial = {}) {
  const store = { ...initial };
  const events = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      dispatchEvent(event) {
        events.push(event);
      },
    },
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
  return { store, events };
}

describe('active account brand-scoped storage', () => {
  beforeEach(() => {
    activeBrandId = 'brand-b';
  });

  test('uses a brand-scoped active account key', () => {
    expect(activeAccountKeyForBrand('Brand B!')).toBe('rnd_active_account_id:brand-b');
    expect(isActiveAccountStorageKey('rnd_active_account_id:brand-b')).toBe(true);
    expect(isActiveAccountStorageKey('rnd_active_account_id:')).toBe(false);
    expect(getActiveAccountStorageKey()).toBe('rnd_active_account_id:brand-b');
  });

  test('reads scoped key before legacy key and ignores invalid ids', () => {
    installStorage({
      [ACTIVE_ACCOUNT_KEY]: '3',
      [activeAccountKeyForBrand('brand-b')]: '7',
      [activeAccountKeyForBrand('brand-c')]: 'bad',
    });

    expect(getActiveAccountId()).toBe(7);
    activeBrandId = 'brand-c';
    expect(getActiveAccountId()).toBeNull();
    activeBrandId = 'main';
    expect(getActiveAccountId()).toBe(3);
  });

  test('writes non-main brands only to their scoped key', () => {
    const { store, events } = installStorage({ [ACTIVE_ACCOUNT_KEY]: '3' });

    setActiveAccountId(8);

    expect(store[ACTIVE_ACCOUNT_KEY]).toBe('3');
    expect(store[activeAccountKeyForBrand('brand-b')]).toBe('8');
    expect(events.at(-1).detail).toMatchObject({
      brandId: 'brand-b',
      key: activeAccountKeyForBrand('brand-b'),
    });
  });

  test('mirrors main brand selection to the legacy key for backup compatibility', () => {
    activeBrandId = 'main';
    const { store } = installStorage();

    setActiveAccountId(2);

    expect(store[ACTIVE_ACCOUNT_KEY]).toBe('2');
    expect(store[activeAccountKeyForBrand('main')]).toBe('2');
  });
});
