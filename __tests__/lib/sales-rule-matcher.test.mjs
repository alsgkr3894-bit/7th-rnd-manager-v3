import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const rules = [];
const getActiveBrandId = jest.fn();

jest.unstable_mockModule('../../lib/sales/classify-rules.js', () => ({
  SALES_RULES: rules,
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: (...args) => getActiveBrandId(...args),
}));

const { matchRule } = await import('../../lib/sales/rule-matcher.js');

beforeEach(() => {
  rules.length = 0;
  getActiveBrandId.mockReturnValue('main');
});

describe('sales rule matcher', () => {
  test('uses first matching exact rule', () => {
    rules.push(
      { ruleId: 'first', matchType: 'exact', pattern: '더블치즈', category: '1인피자' },
      { ruleId: 'second', matchType: 'exact', pattern: '더블치즈', category: '피자' }
    );

    expect(matchRule('더블치즈')?.ruleId).toBe('first');
  });

  test('supports RegExp pattern rules', () => {
    rules.push({
      ruleId: 'pattern',
      matchType: 'pattern',
      pattern: /^고구마.*변경$/,
      category: '피자',
    });

    expect(matchRule('고구마피자 변경')?.ruleId).toBe('pattern');
    expect(matchRule('고구마피자 추가')).toBeNull();
  });

  test('does not use static rules outside main brand', () => {
    rules.push({ ruleId: 'main-only', matchType: 'exact', pattern: '콜라', category: '음료' });
    getActiveBrandId.mockReturnValue('other');

    expect(matchRule('콜라')).toBeNull();
  });
});
