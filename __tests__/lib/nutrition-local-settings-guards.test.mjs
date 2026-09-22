import { afterEach, describe, expect, test } from '@jest/globals';
import {
  applyIngredientName,
  loadIngredientNames,
  saveIngredientNames,
} from '../../lib/nutrition/ingredient-name-override.js';
import {
  applyMenuName,
  clearStaleMenuNameOverrides,
  loadLabelMenuNames,
  loadMenuNames,
  saveLabelMenuNames,
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
      setItem: (key, value) => {
        store[key] = value;
      },
    },
  });
  return store;
}

describe('nutrition local settings guards', () => {
  test('출력명 override는 문자열 값만 복원한다', () => {
    installStorage({
      'v3:nutrition-ingredient-name-override': JSON.stringify({ 치즈: ' 모짜 ', 토마토: 123 }),
      'v3:nutrition-menu-name-override': JSON.stringify({ PZ01: ' 대표피자 ', PZ02: null }),
      'v3:nutrition-label-menu-name-override': JSON.stringify({
        PZ03: ' 표출력피자 ',
        PZ04: 100,
      }),
    });

    expect(loadIngredientNames()).toEqual({ 치즈: ' 모짜 ' });
    expect(loadMenuNames()).toEqual({ PZ01: ' 대표피자 ' });
    expect(loadLabelMenuNames()).toEqual({ PZ03: ' 표출력피자 ' });
  });

  test('apply 함수는 비문자 override를 원래 이름으로 돌린다', () => {
    expect(applyIngredientName('치즈', { 치즈: 123 })).toBe('치즈');
    expect(applyMenuName('PZ01', '피자', { PZ01: null })).toBe('피자');
  });

  test('save 함수는 비문자 값을 저장하지 않고 slice null 저장은 빈 객체로 정규화한다', () => {
    const store = installStorage();

    saveIngredientNames({ 치즈: '모짜', 토마토: 123 });
    saveMenuNames({ PZ01: '피자', PZ02: false });
    saveLabelMenuNames({ PZ03: '표피자', PZ04: false });
    saveSliceCounts(null);

    expect(JSON.parse(store['v3:nutrition-ingredient-name-override'])).toEqual({ 치즈: '모짜' });
    expect(JSON.parse(store['v3:nutrition-menu-name-override'])).toEqual({ PZ01: '피자' });
    expect(JSON.parse(store['v3:nutrition-label-menu-name-override'])).toEqual({
      PZ03: '표피자',
    });
    expect(JSON.parse(store[SLICE_CONFIG_KEY])).toEqual({});
  });

  // 2026-09-22: 메뉴마스터에서 "(1인용)"→"(1인)"으로 바꿨는데 표출력엔 옛 이름이 남던 문제 —
  // 출력용 오버라이드가 예전 마스터명을 그대로 들고 있으면 마스터 변경이 안 보인다.
  test('메뉴마스터 이름 변경 시 예전 마스터명과 같은 오버라이드만 지운다', () => {
    const store = installStorage({
      'v3:nutrition-menu-name-override': JSON.stringify({
        'P-ONE-002': '페페로니 피자(1인용)',
        'P-ONE-001': '하와이안 (1인용)',
        'P-OR-001': '내가 정한 이름',
      }),
      'v3:nutrition-label-menu-name-override': JSON.stringify({
        'P-ONE-002': '페페로니 피자(1인용)',
      }),
    });

    const cleared = clearStaleMenuNameOverrides(['P-ONE-002', 'P-ONE-002'], '페페로니 피자(1인용)');

    expect(cleared).toBe(2);
    expect(JSON.parse(store['v3:nutrition-menu-name-override'])).toEqual({
      'P-ONE-001': '하와이안 (1인용)',
      'P-OR-001': '내가 정한 이름',
    });
    expect(JSON.parse(store['v3:nutrition-label-menu-name-override'])).toEqual({});

    // 공백·"피자" 단어만 다른 변형("하와이안 (1인용)")도 예전 마스터명("하와이안 피자(1인용)")으로 본다
    expect(clearStaleMenuNameOverrides(['P-ONE-001'], '하와이안 피자(1인용)')).toBe(1);
    expect(JSON.parse(store['v3:nutrition-menu-name-override'])).toEqual({
      'P-OR-001': '내가 정한 이름',
    });
    expect(clearStaleMenuNameOverrides(['P-OR-001'], '포크 피자')).toBe(0);
    expect(clearStaleMenuNameOverrides([], '포크 피자')).toBe(0);
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
