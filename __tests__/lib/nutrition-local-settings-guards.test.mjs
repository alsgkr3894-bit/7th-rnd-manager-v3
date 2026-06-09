import { afterEach, describe, expect, test } from '@jest/globals';
import {
  applyIngredientName,
  loadIngredientNames,
  saveIngredientNames,
} from '../../lib/nutrition/ingredient-name-override.js';
import {
  applyMenuName,
  loadMenuNames,
  saveMenuNames,
} from '../../lib/nutrition/menu-name-override.js';
import { saveSliceCounts, SLICE_CONFIG_KEY } from '../../lib/nutrition/slice-config.js';
import { loadOrder, saveOrder } from '../../lib/nutrition/order.js';

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
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
      setItem: (key, value) => { store[key] = value; },
    },
  });
  return store;
}

describe('nutrition local settings guards', () => {
  test('출력명 override는 문자열 값만 복원한다', () => {
    installStorage({
      'v3:nutrition-ingredient-name-override': JSON.stringify({ 치즈: ' 모짜 ', 토마토: 123 }),
      'v3:nutrition-menu-name-override': JSON.stringify({ PZ01: ' 대표피자 ', PZ02: null }),
    });

    expect(loadIngredientNames()).toEqual({ 치즈: ' 모짜 ' });
    expect(loadMenuNames()).toEqual({ PZ01: ' 대표피자 ' });
  });

  test('apply 함수는 비문자 override를 원래 이름으로 돌린다', () => {
    expect(applyIngredientName('치즈', { 치즈: 123 })).toBe('치즈');
    expect(applyMenuName('PZ01', '피자', { PZ01: null })).toBe('피자');
  });

  test('save 함수는 비문자 값을 저장하지 않고 slice null 저장은 빈 객체로 정규화한다', () => {
    const store = installStorage();

    saveIngredientNames({ 치즈: '모짜', 토마토: 123 });
    saveMenuNames({ PZ01: '피자', PZ02: false });
    saveSliceCounts(null);

    expect(JSON.parse(store['v3:nutrition-ingredient-name-override'])).toEqual({ 치즈: '모짜' });
    expect(JSON.parse(store['v3:nutrition-menu-name-override'])).toEqual({ PZ01: '피자' });
    expect(JSON.parse(store[SLICE_CONFIG_KEY])).toEqual({});
  });

  test('영양성분 정렬 순서는 문자열 키만 복원하고 저장한다', () => {
    const store = installStorage({
      'v3:test-order': JSON.stringify(['A', 2, '', 'B']),
    });

    expect(loadOrder('v3:test-order')).toEqual(['A', 'B']);

    saveOrder('v3:test-order', ['C', null, 'D']);

    expect(JSON.parse(store['v3:test-order'])).toEqual(['C', 'D']);
  });
});
