import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const salesRules = [];
const getUserRules = jest.fn();
const getActiveBrandId = jest.fn();

jest.unstable_mockModule('../../lib/sales/classify-rules.js', () => ({
  SALES_RULES: salesRules,
}));

jest.unstable_mockModule('../../lib/sales/store-user-rules.js', () => ({
  getUserRules: (...args) => getUserRules(...args),
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrandId: (...args) => getActiveBrandId(...args),
}));

const {
  getClassificationNameOptions,
  suggestRulesByMenuName,
} = await import('../../lib/sales/suggest.js');

beforeEach(() => {
  salesRules.length = 0;
  getActiveBrandId.mockReturnValue('main');
  getUserRules.mockResolvedValue([]);
});

describe('sales suggest guards', () => {
  test('자동완성 후보는 깨진 규칙을 무시하고 문자열 후보만 정렬한다', async () => {
    salesRules.push(
      null,
      { category: '피자', groupName: '고구마피자', detailName: '고구마피자 L' },
      { category: '음료', groupName: 123, detailName: null },
    );
    getUserRules.mockResolvedValue([
      { enable: false, category: '피자', groupName: '숨김', detailName: '숨김' },
      { category: '사이드', groupName: '치즈볼', detailName: '치즈볼' },
      'bad',
    ]);

    const result = await getClassificationNameOptions();

    expect(result.groupNames).toEqual(['123', '고구마피자', '치즈볼']);
    expect(result.detailNames).toEqual(['고구마피자 L', '치즈볼']);
    expect(result.byCategory).toMatchObject({
      피자: { groupNames: ['고구마피자'], detailNames: ['고구마피자 L'] },
      사이드: { groupNames: ['치즈볼'], detailNames: ['치즈볼'] },
    });
  });

  test('사용자 규칙 조회가 비배열을 반환해도 정적 후보는 유지한다', async () => {
    salesRules.push({ category: '피자', groupName: '불고기피자', detailName: '불고기피자 R' });
    getUserRules.mockResolvedValue('bad');

    const result = await getClassificationNameOptions();

    expect(result.groupNames).toEqual(['불고기피자']);
    expect(result.detailNames).toEqual(['불고기피자 R']);
  });

  test('추천 함수는 잘못된 입력과 limit을 안전하게 처리한다', () => {
    salesRules.push(
      { ruleId: 'a', pattern: '고구마피자', groupName: '고구마피자', detailName: '고구마피자 L' },
      { ruleId: 'b', pattern: '불고기피자', groupName: '불고기피자', detailName: '불고기피자 R' },
    );

    expect(suggestRulesByMenuName(null)).toEqual([]);
    expect(suggestRulesByMenuName('고구마피자 변경', 'bad')).toHaveLength(1);
    expect(suggestRulesByMenuName('고구마피자 변경', 0)).toEqual([]);
  });

  test('메인 브랜드가 아니면 정적 규칙 추천을 사용하지 않는다', async () => {
    salesRules.push({ ruleId: 'a', pattern: '고구마피자', groupName: '고구마피자', detailName: '고구마피자 L' });
    getActiveBrandId.mockReturnValue('other');

    expect(suggestRulesByMenuName('고구마피자 변경')).toEqual([]);
    await expect(getClassificationNameOptions()).resolves.toMatchObject({
      groupNames: [],
      detailNames: [],
      byCategory: {},
    });
  });
});
