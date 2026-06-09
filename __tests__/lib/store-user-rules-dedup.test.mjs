import {
  normKey,
  sameId,
  sameAlias,
  sameRule,
  sameExcluded,
} from '../../lib/sales/store-user-rules.js';

/**
 * 회귀 방지: 사용자 분류 규칙/별칭/제외의 중복 판정.
 * 공백·대소문자 무시(normKey) + 자기 자신(excludeId) 제외 동작을 고정한다.
 */
describe('store-user-rules 중복 판정', () => {
  test('normKey — 공백/대소문자 정규화', () => {
    expect(normKey('  Pep Peroni ')).toBe('pepperoni');
    expect(normKey('페퍼로니')).toBe('페퍼로니');
    expect(normKey(null)).toBe('');
    expect(normKey(123)).toBe('123');
    expect(normKey({ value: 'bad' })).toBe('');
  });

  test('sameId — 문자열/숫자 혼용 비교', () => {
    expect(sameId(1, '1')).toBe(true);
    expect(sameId(1, 2)).toBe(false);
    expect(sameId(undefined, null)).toBe(false); // 'undefined' !== 'null'
  });

  describe('sameAlias', () => {
    test('정규화 후 같은 rawName이면 중복', () => {
      expect(sameAlias({ id: 1, rawName: '페퍼로니 피자' }, '페퍼로니피자', 99)).toBe(true);
    });
    test('자기 자신(excludeId 일치)은 중복 아님', () => {
      expect(sameAlias({ id: 5, rawName: '치즈' }, '치즈', 5)).toBe(false);
    });
    test('다른 이름이면 중복 아님', () => {
      expect(sameAlias({ id: 1, rawName: '치즈' }, '불고기', 99)).toBe(false);
    });
    test('깨진 행이나 입력은 예외 없이 중복 아님으로 처리', () => {
      expect(() => sameAlias(null, '치즈', 99)).not.toThrow();
      expect(sameAlias(null, '치즈', 99)).toBe(false);
    });
  });

  describe('sameRule', () => {
    const base = {
      id: 1,
      rawMenuName: '슈퍼콤비',
      category: '피자',
      groupName: '콤비',
      detailName: '슈퍼콤비',
    };
    test('모든 키 일치 시 중복', () => {
      expect(
        sameRule(
          base,
          { rawMenuName: '슈퍼콤비', category: '피자', groupName: '콤비', detailName: '슈퍼콤비' },
          99
        )
      ).toBe(true);
    });
    test('category가 다르면 중복 아님', () => {
      expect(
        sameRule(
          base,
          {
            rawMenuName: '슈퍼콤비',
            category: '사이드',
            groupName: '콤비',
            detailName: '슈퍼콤비',
          },
          99
        )
      ).toBe(false);
    });
    test('detailName 미입력 시 groupName으로 폴백 비교', () => {
      expect(
        sameRule(
          base,
          { rawMenuName: '슈퍼콤비', category: '피자', groupName: '콤비', detailName: '' },
          99
        )
      ).toBe(false);
      const g = {
        id: 2,
        rawMenuName: 'X',
        category: '피자',
        groupName: '콤비',
        detailName: '콤비',
      };
      expect(
        sameRule(g, { rawMenuName: 'X', category: '피자', groupName: '콤비', detailName: '' }, 99)
      ).toBe(true);
    });
    test('legacy pattern 필드도 rawMenuName으로 매칭', () => {
      const legacy = {
        id: 3,
        pattern: '불고기',
        category: '피자',
        groupName: '클래식',
        detailName: '불고기',
      };
      expect(
        sameRule(
          legacy,
          { rawMenuName: '불고기', category: '피자', groupName: '클래식', detailName: '불고기' },
          99
        )
      ).toBe(true);
    });
    test('깨진 행이나 입력은 예외 없이 중복 아님으로 처리', () => {
      expect(() => sameRule(null, null, 99)).not.toThrow();
      expect(sameRule(null, null, 99)).toBe(false);
    });
  });

  describe('sameExcluded', () => {
    test('정규화 후 같은 menuName이면 중복', () => {
      expect(sameExcluded({ id: 1, menuName: '테스트 메뉴' }, '테스트메뉴', 99)).toBe(true);
    });
    test('자기 자신은 중복 아님', () => {
      expect(sameExcluded({ id: 7, menuName: 'A' }, 'A', 7)).toBe(false);
    });
    test('깨진 행이나 입력은 예외 없이 중복 아님으로 처리', () => {
      expect(() => sameExcluded(null, 'A', 99)).not.toThrow();
      expect(sameExcluded(null, 'A', 99)).toBe(false);
    });
  });
});
