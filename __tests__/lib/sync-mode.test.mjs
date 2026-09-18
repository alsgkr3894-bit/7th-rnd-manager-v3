/**
 * 동기화 모드 판정 테스트.
 * 이 판정이 틀리면 LAN 뷰어가 빈 IndexedDB를 서버로 밀어 올려 데이터를 파괴한다.
 * 모르는 호스트는 반드시 READONLY로 닫혀야 한다.
 */
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

const MODULE = '../../lib/db/sync-mode.js';

function installBrowser(hostname, storage = {}) {
  const store = { ...storage };
  globalThis.window = { location: { hostname } };
  globalThis.localStorage = {
    getItem: key => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: key => {
      delete store[key];
    },
  };
  return store;
}

async function loadFresh() {
  // 모듈 자체는 상태를 캐시하지 않지만, 호출 시점 환경을 확실히 반영하려고 매번 새로 읽는다.
  return import(`${MODULE}?t=${Math.random()}`);
}

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
});
afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});

describe('resolveSyncMode — 호스트 기반 자동 판정', () => {
  test.each(['localhost', '127.0.0.1'])('루프백 %s 은 authoritative', async hostname => {
    installBrowser(hostname);
    const { resolveSyncMode, isAuthoritativeClient, SYNC_MODE } = await loadFresh();
    expect(resolveSyncMode()).toBe(SYNC_MODE.AUTHORITATIVE);
    expect(isAuthoritativeClient()).toBe(true);
  });

  test.each(['192.168.1.50', '10.0.0.7', '172.20.1.9', 'rnd-pc'])(
    '비루프백 %s 은 readonly',
    async hostname => {
      installBrowser(hostname);
      const { resolveSyncMode, isAuthoritativeClient, SYNC_MODE } = await loadFresh();
      expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
      expect(isAuthoritativeClient()).toBe(false);
    }
  );

  test('SSR(window 없음)에서는 authoritative지만 푸시는 별도로 막힌다', async () => {
    const { resolveSyncMode, SYNC_MODE } = await loadFresh();
    expect(resolveSyncMode()).toBe(SYNC_MODE.AUTHORITATIVE);
  });
});

describe('오버라이드', () => {
  test('저장된 오버라이드가 호스트 판정을 이긴다', async () => {
    installBrowser('localhost', { 'v3:server-sync-mode': 'readonly' });
    const { resolveSyncMode, isAuthoritativeClient, SYNC_MODE } = await loadFresh();
    expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
    expect(isAuthoritativeClient()).toBe(false);
  });

  test('LAN IP에서도 오버라이드로 authoritative 지정 가능', async () => {
    installBrowser('192.168.1.50', { 'v3:server-sync-mode': 'authoritative' });
    const { isAuthoritativeClient } = await loadFresh();
    expect(isAuthoritativeClient()).toBe(true);
  });

  test('알 수 없는 오버라이드 값은 무시하고 자동 판정으로 돌아간다', async () => {
    installBrowser('192.168.1.50', { 'v3:server-sync-mode': 'nonsense' });
    const { resolveSyncMode, hasSyncModeOverride, SYNC_MODE } = await loadFresh();
    expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
    expect(hasSyncModeOverride()).toBe(false);
  });

  test('setSyncModeOverride 저장·해제', async () => {
    const store = installBrowser('localhost');
    const { setSyncModeOverride, resolveSyncMode, hasSyncModeOverride, SYNC_MODE } =
      await loadFresh();

    expect(setSyncModeOverride(SYNC_MODE.READONLY)).toBe(true);
    expect(store['v3:server-sync-mode']).toBe('readonly');
    expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
    expect(hasSyncModeOverride()).toBe(true);

    expect(setSyncModeOverride(null)).toBe(true);
    expect(hasSyncModeOverride()).toBe(false);
    expect(resolveSyncMode()).toBe(SYNC_MODE.AUTHORITATIVE);
  });

  test('잘못된 값은 저장을 거부한다', async () => {
    installBrowser('localhost');
    const { setSyncModeOverride } = await loadFresh();
    expect(setSyncModeOverride('admin')).toBe(false);
  });

  test('localStorage 접근이 막혀도 예외를 던지지 않는다', async () => {
    globalThis.window = { location: { hostname: '192.168.1.50' } };
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const { resolveSyncMode, setSyncModeOverride, SYNC_MODE } = await loadFresh();
    expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
    expect(setSyncModeOverride(SYNC_MODE.READONLY)).toBe(false);
  });
});

describe('NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY — 샌드박스 강제 읽기전용', () => {
  const ENV_KEY = 'NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY';
  const originalEnv = process.env[ENV_KEY];

  afterEach(() => {
    if (originalEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnv;
  });

  test('localhost + authoritative 오버라이드여도 강제로 readonly가 된다', async () => {
    // 2026-09-17 사고 재현 방지: 샌드박스(3002)도 localhost라 자동 판정은 authoritative고,
    // 사용자가 "운영 PC로 지정"을 눌러도 이 플래그가 켜져 있으면 뒤집을 수 없어야 한다.
    process.env[ENV_KEY] = '1';
    installBrowser('localhost', { 'v3:server-sync-mode': 'authoritative' });
    const { resolveSyncMode, isAuthoritativeClient, isSyncModeForcedReadonly, SYNC_MODE } =
      await loadFresh();
    expect(isSyncModeForcedReadonly()).toBe(true);
    expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
    expect(isAuthoritativeClient()).toBe(false);
  });

  test('플래그가 꺼져 있으면(기본) localhost는 그대로 authoritative', async () => {
    delete process.env[ENV_KEY];
    installBrowser('localhost');
    const { resolveSyncMode, isSyncModeForcedReadonly, SYNC_MODE } = await loadFresh();
    expect(isSyncModeForcedReadonly()).toBe(false);
    expect(resolveSyncMode()).toBe(SYNC_MODE.AUTHORITATIVE);
  });

  test('SSR(window 없음)에서도 강제 readonly가 우선한다', async () => {
    process.env[ENV_KEY] = '1';
    const { resolveSyncMode, SYNC_MODE } = await loadFresh();
    expect(resolveSyncMode()).toBe(SYNC_MODE.READONLY);
  });
});
