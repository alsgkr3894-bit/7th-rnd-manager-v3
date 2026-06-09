import { describe, expect, test } from '@jest/globals';
import { MODULE_KEYS } from '../../lib/db/index.js';
import { buildModuleScopeMap, isKnownModuleScope } from '../../hooks/useModuleScopes.js';

describe('buildModuleScopeMap', () => {
  test('모든 알려진 모듈 키를 boolean 값으로 만든다', () => {
    const scopes = buildModuleScopeMap(1);

    expect(Object.keys(scopes)).toEqual(MODULE_KEYS);
    expect(Object.values(scopes).every(value => value === true)).toBe(true);
  });

  test('초기값은 Boolean 기준으로 정규화한다', () => {
    expect(Object.values(buildModuleScopeMap(0)).every(value => value === false)).toBe(true);
    expect(Object.values(buildModuleScopeMap('yes')).every(value => value === true)).toBe(true);
  });
});

describe('isKnownModuleScope', () => {
  test('알려진 모듈 키만 허용한다', () => {
    expect(isKnownModuleScope(MODULE_KEYS[0])).toBe(true);
    expect(isKnownModuleScope('unknown-module')).toBe(false);
    expect(isKnownModuleScope(null)).toBe(false);
  });
});
