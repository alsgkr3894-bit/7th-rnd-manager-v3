import { describe, expect, test } from '@jest/globals';
import { makeFieldUpdater, normalizeFieldKey, normalizeObjectState } from '../../lib/ui/form-state.js';

describe('normalizeFieldKey', () => {
  test('문자열/숫자/symbol key는 보존한다', () => {
    const sym = Symbol('field');
    expect(normalizeFieldKey('name')).toBe('name');
    expect(normalizeFieldKey(1)).toBe(1);
    expect(normalizeFieldKey(sym)).toBe(sym);
  });

  test('객체/null key는 무시한다', () => {
    expect(normalizeFieldKey(null)).toBeNull();
    expect(normalizeFieldKey({ key: 'bad' })).toBeNull();
  });
});

describe('normalizeObjectState', () => {
  test('일반 객체만 상태 병합 대상으로 보존한다', () => {
    const value = { a: 1 };
    expect(normalizeObjectState(value)).toBe(value);
    expect(normalizeObjectState(null)).toEqual({});
    expect(normalizeObjectState([])).toEqual({});
  });
});

describe('makeFieldUpdater', () => {
  test('객체 상태의 단일 필드를 갱신한다', () => {
    let state = { a: 1 };
    const setState = updater => { state = updater(state); };
    makeFieldUpdater(setState)('b', 2);
    expect(state).toEqual({ a: 1, b: 2 });
  });

  test('비함수 setter와 비정상 key는 안전하게 무시한다', () => {
    expect(() => makeFieldUpdater(null)('a', 1)).not.toThrow();
    let called = false;
    const setState = () => { called = true; };
    makeFieldUpdater(setState)({ bad: true }, 1);
    expect(called).toBe(false);
  });
});
