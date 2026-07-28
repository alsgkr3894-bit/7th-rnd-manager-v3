/**
 * 서버 → IndexedDB 하이드레이션의 키 복원 테스트.
 *
 * 여기서 타입을 틀리면(문자열 '12' vs 숫자 12) IndexedDB 키가 달라져
 * fileId·parentId·ingredientId 같은 store 간 참조가 조용히 끊어진다.
 */
import { describe, expect, test } from '@jest/globals';

import { materializeRecord } from '../../lib/db/server-hydrate.js';

describe('materializeRecord — 키 복원', () => {
  test('data에 이미 키가 있으면 그대로 둔다', () => {
    const data = { id: 7, name: '마르게리따' };
    expect(materializeRecord('cost_ingredients', { recordKey: '7', data })).toBe(data);
  });

  test('키가 없으면 legacyNumericId를 숫자 그대로 채운다', () => {
    const record = materializeRecord('cost_ingredients', {
      recordKey: '12',
      legacyNumericId: 12,
      data: { name: '치즈' },
    });
    expect(record.id).toBe(12);
    expect(typeof record.id).toBe('number');
  });

  test('legacyNumericId가 없으면 숫자형 recordKey를 숫자로 변환한다', () => {
    const record = materializeRecord('cost_ingredients', {
      recordKey: '34',
      legacyNumericId: null,
      data: { name: '도우' },
    });
    expect(record.id).toBe(34);
    expect(typeof record.id).toBe('number');
  });

  test('숫자가 아닌 recordKey는 문자열로 유지한다', () => {
    const record = materializeRecord('cost_platform_fees', {
      recordKey: 'baemin-L',
      legacyNumericId: null,
      data: { rate: 0.1 },
    });
    expect(record.id).toBe('baemin-L');
  });

  test('settings store는 keyPath가 key다', () => {
    const record = materializeRecord('settings', {
      recordKey: 'theme',
      legacyNumericId: null,
      data: { value: 'dark' },
    });
    expect(record.key).toBe('theme');
    expect(record.id).toBeUndefined();
  });

  test('migration_flags store는 keyPath가 flag다', () => {
    const record = materializeRecord('migration_flags', {
      recordKey: 'v24-market',
      legacyNumericId: null,
      data: { done: true },
    });
    expect(record.flag).toBe('v24-market');
  });

  test('settings에 이미 key가 있으면 건드리지 않는다', () => {
    const data = { key: 'density', value: 'compact' };
    expect(materializeRecord('settings', { recordKey: 'density', data })).toBe(data);
  });

  test('legacyNumericId가 recordKey보다 우선한다', () => {
    const record = materializeRecord('cost_ingredients', {
      recordKey: '99__client:abcdef0123456789',
      legacyNumericId: 99,
      data: { name: '분기된 행' },
    });
    expect(record.id).toBe(99);
  });

  test('data가 객체가 아니면 null을 돌려 걸러지게 한다', () => {
    expect(materializeRecord('cost_ingredients', { data: null })).toBeNull();
    expect(materializeRecord('cost_ingredients', { data: [1, 2] })).toBeNull();
    expect(materializeRecord('cost_ingredients', {})).toBeNull();
  });

  test('recordKey도 legacyNumericId도 없으면 원본을 그대로 둔다', () => {
    const data = { name: '키 없음' };
    expect(materializeRecord('cost_ingredients', { recordKey: '', data })).toBe(data);
  });

  test('0은 유효한 키다 (falsy 함정)', () => {
    const record = materializeRecord('cost_ingredients', {
      recordKey: '0',
      legacyNumericId: 0,
      data: { name: '영번' },
    });
    expect(record.id).toBe(0);
  });
});
