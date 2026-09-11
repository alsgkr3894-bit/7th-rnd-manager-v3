import { describe, expect, test } from '@jest/globals';
import { buildIrregularMenuNameSet, isIrregularMenuName } from '../../lib/sales/irregular-menu.js';

describe('buildIrregularMenuNameSet / isIrregularMenuName', () => {
  test('ref_discontinued 행의 메뉴명을 정규화해 모은다', () => {
    const set = buildIrregularMenuNameSet([
      { id: 1, menuName: '깜짝세트' },
      { id: 2, menuName: '' }, // 빈 이름 무시
    ]);
    expect(isIrregularMenuName('깜짝세트', set)).toBe(true);
    expect(set.size).toBe(1);
  });

  test('괄호·공백 표기가 달라도 정규화 후 매칭한다', () => {
    const set = buildIrregularMenuNameSet([{ menuName: '깜짝세트(대)' }]);
    expect(isIrregularMenuName('깜짝세트 대', set)).toBe(true);
  });

  test('빈 집합·잘못된 입력에는 false를 반환한다(오탐 방지)', () => {
    expect(isIrregularMenuName('아무거나', new Set())).toBe(false);
    expect(isIrregularMenuName('아무거나', null)).toBe(false);
    expect(buildIrregularMenuNameSet(null).size).toBe(0);
    expect(buildIrregularMenuNameSet(undefined).size).toBe(0);
  });

  test('목록에 없는 이름은 false', () => {
    const set = buildIrregularMenuNameSet([{ menuName: '깜짝세트' }]);
    expect(isIrregularMenuName('전혀 다른 메뉴', set)).toBe(false);
  });
});
