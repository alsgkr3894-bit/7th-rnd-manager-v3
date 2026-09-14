import { describe, expect, test } from '@jest/globals';
import {
  allergenStateLabel,
  allergenText,
  originStateLabel,
  originText,
} from '../../lib/ingredient/origin-allergen-text.js';

describe('origin-allergen-text — 원산지·알레르기 요약/상태 텍스트', () => {
  test('값이 있으면 이름을 나열한다', () => {
    const r = { origin: [{ displayName: '', country: '미국' }], allergens: ['AL06', 'AL05'] };
    expect(originText(r)).toBe('미국');
    expect(allergenText(r)).toContain(',');
  });

  test('originHidden이면 "비표기", originNone이면 "없음"', () => {
    expect(originText({ originHidden: true })).toBe('비표기');
    expect(originText({ originNone: true })).toBe('없음');
  });

  test('originHidden이 originNone보다 우선한다', () => {
    expect(originText({ originHidden: true, originNone: true })).toBe('비표기');
  });

  test('allergenNone이면 값과 무관하게 "없음"', () => {
    expect(allergenText({ allergens: ['AL06'], allergenNone: true })).toBe('없음');
  });

  test('아무 정보도 없고 명시도 안 됐으면 빈 문자열', () => {
    expect(originText({})).toBe('');
    expect(allergenText({})).toBe('');
  });

  test('originStateLabel — 체크박스 상태를 이름 그대로 구분한다', () => {
    expect(originStateLabel({ originHidden: true })).toBe('미표시대상(비표기)');
    expect(originStateLabel({ originNone: true })).toBe('원산지 없음');
    expect(originStateLabel({ origin: [{ country: '미국' }] })).toBe('표기');
    expect(originStateLabel({})).toBe('미입력');
  });

  test('allergenStateLabel', () => {
    expect(allergenStateLabel({ allergenNone: true })).toBe('알레르기 없음');
    expect(allergenStateLabel({ allergens: ['AL06'] })).toBe('표기');
    expect(allergenStateLabel({})).toBe('미입력');
  });
});
