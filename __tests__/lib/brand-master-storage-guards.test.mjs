import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  BRAND_MASTER_EVENT,
  BRAND_MASTER_KEY,
  getBrands,
  upsertBrand,
} from '../../lib/brand-master.js';

const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;
const originalCustomEvent = globalThis.CustomEvent;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: originalCustomEvent,
  });
});

function installStorage({ initial = {}, throwOnSet = false } = {}) {
  const store = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        if (throwOnSet) throw new Error('storage blocked');
        store[key] = String(value);
      },
    },
  });
  return store;
}

describe('brand master storage guards', () => {
  test('브랜드 설정 저장 실패는 한국어 오류로 노출한다', () => {
    installStorage({ throwOnSet: true });

    expect(() =>
      upsertBrand({
        id: 'test-brand',
        name: '테스트 브랜드',
        color: '#123456',
      })
    ).toThrow('브랜드 설정을 저장하지 못했습니다');
  });

  test('이벤트 발행 실패는 이미 성공한 저장을 깨뜨리지 않는다', () => {
    const store = installStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        dispatchEvent: jest.fn(() => {
          throw new Error('event blocked');
        }),
      },
    });

    const brands = upsertBrand({
      id: 'event-safe',
      name: '이벤트 안전',
      color: '#654321',
    });

    expect(brands.some(brand => brand.id === 'event-safe')).toBe(true);
    expect(
      JSON.parse(store[BRAND_MASTER_KEY]).brands.some(brand => brand.id === 'event-safe')
    ).toBe(true);
  });

  test('CustomEvent가 있는 환경에서는 브랜드 변경 이벤트를 발행한다', () => {
    installStorage();
    const events = [];
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      value: class {
        constructor(type) {
          this.type = type;
        }
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        dispatchEvent: event => events.push(event),
      },
    });

    upsertBrand({ id: 'event-brand', name: '이벤트 브랜드', color: '#112233' });

    expect(events.map(event => event.type)).toContain(BRAND_MASTER_EVENT);
  });

  test('저장소가 없으면 기본 브랜드 목록으로 안전하게 동작한다', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    expect(getBrands().some(brand => brand.id === 'main')).toBe(true);
  });
});
