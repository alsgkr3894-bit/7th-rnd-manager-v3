import { describe, expect, test } from '@jest/globals';
import { componentSubtotal, recipeIssues, simpleTotalCost } from '../../lib/cost/shared/calc.js';

describe('cost shared calc guards', () => {
  test('잘못된 숫자는 계산을 0으로 안전 처리하고 진단에 표시한다', () => {
    const component = { ingredientName: '치즈', quantity: 'abc', unitPrice: '12x' };

    expect(componentSubtotal(component)).toBe(0);
    expect(simpleTotalCost({ components: [component] })).toBe(0);
    expect(recipeIssues({ components: [component] })).toEqual([
      { kind: 'invalid-qty', index: 0, name: '치즈' },
      { kind: 'invalid-price', index: 0, name: '치즈' },
    ]);
  });

  test('공백 문자열은 0이 아니라 미입력으로 진단한다', () => {
    expect(
      recipeIssues({
        components: [{ ingredientName: '소스', quantity: '   ', unitPrice: '' }],
      })
    ).toEqual([
      { kind: 'no-qty', index: 0, name: '소스' },
      { kind: 'no-price', index: 0, name: '소스' },
    ]);
  });

  test('정상 숫자 문자열은 기존처럼 합계 계산에 포함한다', () => {
    expect(componentSubtotal({ quantity: '12.5', unitPrice: '8' })).toBe(100);
  });
});
