import { describe, expect, test } from '@jest/globals';
import {
  formatQuickPrice,
  ingredientSearchText,
  normalizeIngredientSearchText,
  quickQuantityValue,
} from '../../components/menu-master/recipe/quickAddHelpers.js';

describe('normalizeIngredientSearchText', () => {
  test('공백을 제거하고 소문자로 정규화한다', () => {
    expect(normalizeIngredientSearchText(' Tomato  Sauce ')).toBe('tomatosauce');
  });

  test('null/undefined는 빈 문자열로 취급한다', () => {
    expect(normalizeIngredientSearchText(null)).toBe('');
    expect(normalizeIngredientSearchText(undefined)).toBe('');
  });
});

describe('ingredientSearchText', () => {
  test('식자재명과 제품코드를 합쳐 정규화한다', () => {
    expect(ingredientSearchText({ ingredientName: '토마토 소스', productCode: 'ING-001' })).toBe(
      '토마토소스ing-001'
    );
  });

  test('필드가 없어도 에러 없이 빈 문자열 기반으로 동작한다', () => {
    expect(ingredientSearchText({})).toBe('');
    expect(ingredientSearchText(null)).toBe('');
  });
});

describe('formatQuickPrice', () => {
  test('단가 정보가 없으면 "단가 없음"을 반환한다', () => {
    expect(formatQuickPrice(null)).toBe('단가 없음');
    expect(formatQuickPrice({ unitPrice: null })).toBe('단가 없음');
  });

  test('단가와 기준단위를 "원/단위" 형식으로 표시한다', () => {
    expect(formatQuickPrice({ unitPrice: 1234, baseUnitType: 'g' })).toBe('1,234원/g');
  });

  test('baseUnitType이 없으면 기본값 g를 사용한다', () => {
    expect(formatQuickPrice({ unitPrice: 500 })).toBe('500원/g');
  });
});

describe('quickQuantityValue', () => {
  test('0보다 큰 숫자 문자열은 그대로 반환한다', () => {
    expect(quickQuantityValue('30')).toBe('30');
  });

  test('빈 값/공백/0/음수/숫자가 아닌 값은 빈 문자열로 정규화한다', () => {
    expect(quickQuantityValue('')).toBe('');
    expect(quickQuantityValue('   ')).toBe('');
    expect(quickQuantityValue('0')).toBe('');
    expect(quickQuantityValue('-5')).toBe('');
    expect(quickQuantityValue('abc')).toBe('');
  });

  test('null/undefined도 빈 문자열로 정규화한다', () => {
    expect(quickQuantityValue(null)).toBe('');
    expect(quickQuantityValue(undefined)).toBe('');
  });
});
