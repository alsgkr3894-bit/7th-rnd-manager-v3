import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  DEFAULT_JETTE_SETTINGS,
  JETTE_SETTINGS_KEY,
  getPriceAlertThreshold,
  getStoredJetteSettings,
  isPriceChangeAlert,
  normalizeJetteSettings,
} from '../../lib/jette/settings.js';
import { buildAutoRegisterCandidates } from '../../lib/jette/auto-register.js';

const originalLocalStorage = globalThis.localStorage;
let warnSpy;

afterEach(() => {
  warnSpy?.mockRestore();
  warnSpy = undefined;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installStorage(initial = {}) {
  const store = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
    },
  });
  return store;
}

describe('jette settings guards', () => {
  test('제때 설정은 저장값을 업무 범위로 정규화한다', () => {
    expect(normalizeJetteSettings(null)).toEqual(DEFAULT_JETTE_SETTINGS);
    expect(
      normalizeJetteSettings({
        priceAlertThreshold: '6.7',
        autoRecalcOnUpdate: false,
        autoRegisterNew: 'auto',
      })
    ).toEqual({
      priceAlertThreshold: 7,
      autoRecalcOnUpdate: false,
      autoRegisterNew: 'auto',
    });
    expect(normalizeJetteSettings({ priceAlertThreshold: -10 }).priceAlertThreshold).toBe(1);
    expect(normalizeJetteSettings({ priceAlertThreshold: 99 }).priceAlertThreshold).toBe(50);
  });

  test('가격 변동 알림은 인상/인하와 임계값 이상 변동만 대상으로 본다', () => {
    expect(isPriceChangeAlert({ changeStatus: '인상', changeRate: 0.051 }, 5)).toBe(true);
    expect(isPriceChangeAlert({ changeStatus: '인하', changeRate: -0.049 }, 5)).toBe(false);
    expect(isPriceChangeAlert({ changeStatus: '신규', changeRate: 1 }, 5)).toBe(false);
    expect(getPriceAlertThreshold({ priceAlertThreshold: 'bad' })).toBe(5);
  });

  test('localStorage 제때 설정은 깨진 값이면 기본값으로 복구한다', () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    installStorage({ [JETTE_SETTINGS_KEY]: '{bad json' });

    expect(getStoredJetteSettings()).toEqual(DEFAULT_JETTE_SETTINGS);
  });

  test('신규 제품 자동등록 후보는 기존 코드와 중복 행을 제외한다', () => {
    const result = buildAutoRegisterCandidates(
      [
        { productCode: ' A ', productName: '치즈' },
        { productCode: 'A', productName: '치즈 중복' },
        { productCode: 'B', productName: '소스' },
        { productCode: 'C', productName: '' },
        null,
      ],
      [{ productCode: 'B', productName: '기존 소스' }]
    );

    expect(result).toEqual([
      { productCode: 'A', productName: '치즈', productType: 'generic', isManaged: false },
    ]);
  });
});
