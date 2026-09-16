import { describe, expect, test } from '@jest/globals';
import {
  buildRegisteredOverrideNameSet,
  isRegisteredOverrideName,
} from '../../lib/sales/registered-override.js';

describe('buildRegisteredOverrideNameSet / isRegisteredOverrideName', () => {
  test('ref_registered_overrides 행의 메뉴명을 정규화해 모은다', () => {
    const set = buildRegisteredOverrideNameSet([
      { id: 1, menuName: '석쇠' },
      { id: 2, menuName: '' }, // 빈 이름 무시
    ]);
    expect(isRegisteredOverrideName('석쇠', set)).toBe(true);
    expect(set.size).toBe(1);
  });

  test('괄호·공백 표기가 달라도 정규화 후 매칭한다', () => {
    const set = buildRegisteredOverrideNameSet([{ menuName: '페페로니(P)' }]);
    expect(isRegisteredOverrideName('페페로니 P', set)).toBe(true);
  });

  test('빈 집합·잘못된 입력에는 false를 반환한다(오탐 방지)', () => {
    expect(isRegisteredOverrideName('아무거나', new Set())).toBe(false);
    expect(isRegisteredOverrideName('아무거나', null)).toBe(false);
    expect(buildRegisteredOverrideNameSet(null).size).toBe(0);
    expect(buildRegisteredOverrideNameSet(undefined).size).toBe(0);
  });

  test('목록에 없는 이름은 false', () => {
    const set = buildRegisteredOverrideNameSet([{ menuName: '석쇠' }]);
    expect(isRegisteredOverrideName('전혀 다른 메뉴', set)).toBe(false);
  });
});
